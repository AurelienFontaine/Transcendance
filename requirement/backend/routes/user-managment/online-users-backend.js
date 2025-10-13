const onlineUsers = new Map(); //stock id users connectés et le nbr de sessions
// Clé = userId, Valeur = nombre de sessions actives
//set/get/delete gèrent l’ajout, la lecture et la suppression du compteur.
const socketUsers = new Map();
// Map<userId, Set<WebSocket>[]> -> ensemble des sockets ouvertes pour chaque user

module.exports = {onlineUsers, socketUsers};