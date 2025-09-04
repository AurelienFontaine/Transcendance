// requirement/frontend/handlers/game/tournament.ts

export interface Player {
  id: number;
  display: string;
}

interface Match {
  p1: Player;
  p2: Player;
  played: boolean;
  s1?: number;
  s2?: number;
}

export class Tournament {
  private players: Player[] = [];
  private matches: Match[] = [];
  private currentIndex = 0;
  private standings: Map<number, number> = new Map(); // Map<playerId, points>

  addPlayer(player: Player) {
    if (this.players.some(p => p.id === player.id)) {
      throw new Error(`Player ${player.display} already added`);
    }
    this.players.push(player);
    this.standings.set(player.id, 0);
  }

  generateMatches() {
    this.matches = [];
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        this.matches.push({ p1: this.players[i], p2: this.players[j], played: false });
      }
    }
    this.currentIndex = 0;
  }

  nextMatch(): Match | null {
    while (this.currentIndex < this.matches.length) {
      const match = this.matches[this.currentIndex];
      if (!match.played) {
        return match;
      }
      this.currentIndex++;
    }
    return null;
  }

  reportResult(p1Id: number, p2Id: number, s1: number, s2: number) {
    const match = this.matches.find(
      m => m.p1.id === p1Id && m.p2.id === p2Id && !m.played
    );
    if (!match) throw new Error("Match not found or already played");

    match.played = true;
    match.s1 = s1;
    match.s2 = s2;

    if (s1 > s2) {
      this.standings.set(p1Id, (this.standings.get(p1Id) || 0) + 3);
    } else if (s2 > s1) {
      this.standings.set(p2Id, (this.standings.get(p2Id) || 0) + 3);
    } else {
      this.standings.set(p1Id, (this.standings.get(p1Id) || 0) + 1);
      this.standings.set(p2Id, (this.standings.get(p2Id) || 0) + 1);
    }
  }

  getStandings() {
    return Array.from(this.standings.entries())
      .map(([id, points]) => {
        const player = this.players.find(p => p.id === id)!;
        return { id, alias: player.display, points };
      })
      .sort((a, b) => b.points - a.points);
  }
}
