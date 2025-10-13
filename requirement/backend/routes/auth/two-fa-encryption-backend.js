const crypto = require('crypto');

//s'assure que la chaine fait 32 octet exactement
function loadkey(){
	const raw = process.env.ENCRYPTION_KEY;
	if (!raw) throw new Error('ENCRYPTION_KEY manquante');

	let keyBuf;
	if (raw.startsWith('base64:')) {
		keyBuf = Buffer.from(raw.slice(7), 'base64');
	} else if (raw.startsWith('hex:')) {
		keyBuf = Buffer.from(raw.slice(4), 'hex');
	} else {
		keyBuf = Buffer.from(raw, 'utf8');
	}
	if (keyBuf.length !== 32) {
		throw new Error(`ENCRYPTION_KEY invalide: attendu 32 octets, reçu ${keyBuf.length}`);
	}
	return keyBuf;
}

const key = loadkey();
// Formats acceptés:
  // - base64: "base64:...."
  // - hex:    "hex:...."
  // - brut:   32 octets en binaire (rare), eviter

//fonciton d'encryption de a clef pour 2fa
function encrypt(text){
	const iv = crypto.randomBytes(12); // IV(initialized vector) aleatoir de 12 octets
	//obligatoire pour AES-GCM : il garantit que deux textes identiques chiffrés avec la même clé donneront des résultats différents.
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv); //cipher = chiffreur, aes-256-gcm = algo choisi
	const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);//chiffre text en binaire
	const tag = cipher.getAuthTag(); //AES en mode GCM genere un auth tag (16 octets), verification de l'integrite
	return Buffer.concat([iv, tag, encrypted]).toString('base64'); //regroupe en un seu bloc binaire + encode
}

function decrypt(text){
	const data = Buffer.from(text, 'base64');//transform chaine base64 en buffer binaire
	if (data.length < 29) throw new Error('payload chiffré trop court');
	const iv = data.subarray(0, 12);//iv = 12 premiers octets
	const tag = data.subarray(12, 28);//tab = 16 suivant
	const enc = data.subarray(28); //e reste est e msg chiffre

	const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv); //creation dechiffreur avec cle +iv
	decipher.setAuthTag(tag);//utilisation tag pour valide integrite
	const plain = Buffer.concat([decipher.update(enc), decipher.final()]); //dechiffrement fina contenu et conversion string en UTF-8
	return plain.toString('utf8');
}

module.exports = { encrypt, decrypt };

/**
 * AES-256-GCM : mode de chiffrement qui offre confidentialité + intégrité (auth tag).
 * Clé (key) : 32 bytes pour AES-256, unique et stockée en .env.
 * IV (Initialization Vector) : valeur aléatoire, différente à chaque chiffrement, garantit que deux mêmes secrets produisent des résultats différents.
 * Tag : utilisé pour vérifier que le message n’a pas été altéré.
 * Base64 : format texte universel pour stocker des données binaires dans une DB ou les transmettre en JSON.
 * Chiffrement ≠ hashage : ici on doit pouvoir relire le secret, donc on utilise du chiffrement (réversible)
 */