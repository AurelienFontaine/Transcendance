// requirement/shared/game/tournament.ts
export type Match = { p1: string; p2: string };

export type StandingRow = {
  alias: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;        // scoring-by-goals: max(own - opp, 0)
};

export class Tournament {
  private players: string[] = [];
  private schedule: Match[] = [];
  private cursor = 0;
  private table: Map<string, StandingRow> = new Map();

  addPlayer(alias: string) {
    alias = alias.trim();
    if (!alias || this.players.includes(alias)) return;
    this.players.push(alias);
    if (!this.table.has(alias)) {
      this.table.set(alias, {
        alias,
        played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      });
    }
  }

  resetPlayers() {
    this.players = [];
    this.schedule = [];
    this.cursor = 0;
    this.table.clear();
  }

  /** Round-robin: n(n-1)/2 matches */
  generateMatches() {
    const m: Match[] = [];
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        m.push({ p1: this.players[i], p2: this.players[j] });
      }
    }
    this.schedule = m;
    this.cursor = 0;
  }

  /** Returns the full schedule */
  getMatches(): Match[] {
    return this.schedule.slice();
  }

  /** Returns the next match, or null if finished */
  nextMatch(): Match | null {
    if (this.cursor >= this.schedule.length) return null;
    return this.schedule[this.cursor];
  }

  /** Records a finished match and advances the cursor */
  reportResult(p1: string, p2: string, s1: number, s2: number) {
    // update cursor only if this match is the current one
    const cur = this.nextMatch();
    if (cur && ((cur.p1 === p1 && cur.p2 === p2) || (cur.p1 === p2 && cur.p2 === p1))) {
      this.cursor++;
    }

    const a = this.table.get(p1);
    const b = this.table.get(p2);
    if (!a || !b) return;

    a.played++; b.played++;
    a.goalsFor += s1; a.goalsAgainst += s2;
    b.goalsFor += s2; b.goalsAgainst += s1;

    if (s1 > s2) { a.wins++; b.losses++; }
    else if (s2 > s1) { b.wins++; a.losses++; }
    else { a.draws++; b.draws++; }

    // scoring-by-goals to break ties:
    // winner gets (own - opp) points, loser gets 0; draw gives 0 to both.
    a.points += Math.max(s1 - s2, 0);
    b.points += Math.max(s2 - s1, 0);
  }

  /** Standings sorted by points, then goal diff, then goals for, then alias */
  getStandings(): StandingRow[] {
    return Array.from(this.table.values()).sort((x, y) => {
      if (y.points !== x.points) return y.points - x.points;
      const gdX = x.goalsFor - x.goalsAgainst;
      const gdY = y.goalsFor - y.goalsAgainst;
      if (gdY !== gdX) return gdY - gdX;
      if (y.goalsFor !== x.goalsFor) return y.goalsFor - x.goalsFor;
      return x.alias.localeCompare(y.alias);
    });
  }

  isFinished(): boolean {
    return this.cursor >= this.schedule.length && this.schedule.length > 0;
  }
}
