import { Entity, Script, Vector3, Player, UI } from 'horizon';

/**
 * FlagFootball_ScoreManager.ts
 * Purpose: Manages game state, scoring, and game flow for 7v7 Flag Football.
 */
export class FlagFootball_ScoreManager extends Script {
    // Public Properties
    public gameMode: string = "Standard";
    public ManualSpotting: boolean = false;
    public gameDurationMinutes: number = 20;
    public quarterDurationMinutes: number = 5;
    public yardsForFirstDown: number = 20;
    public touchdownPoints: number = 6;
    public extraPointPoints: number = 1;
    public safetyPoints: number = 2;
    public maxPlayersPerTeam: number = 7;

    // Field Boundaries (set by FieldSetup_Gizmo)
    private fieldBounds: any = null;

    // Game State
    private gameState: any = {
        isGameActive: false,
        isHalftime: false,
        isGameOver: false,
        currentQuarter: 1,
        timeRemaining: 1200,
        gameClock: 1200,
        playClock: 25
    };

    // Team Data
    private teams: any = {
        teamA: {
            players: [],
            score: 0,
            timeouts: 3,
            flags: []
        },
        teamB: {
            players: [],
            score: 0,
            timeouts: 3,
            flags: []
        }
    };

    // Down and Distance Management
    private downAndDistance: any = {
        currentDown: 1,
        yardsToGo: 20,
        ballPosition: new Vector3(0, 0, 0),
        lineOfScrimmage: new Vector3(0, 0, 0),
        lineToGain: new Vector3(0, 0, 20),
        possession: 'teamA'
    };

    // Referee System
    private refereeSystem: any = {
        designatedReferee: null,
        waitingForSpot: false,
        spotRequested: false,
        lastSpotPosition: new Vector3(0, 0, 0)
    };

    // UI Elements
    private scoreboardUI: UI | null = null;
    private downMarkerUI: UI | null = null;

    public async start(): Promise<void> {
        try {
            console.log("[FlagFootball_ScoreManager] Starting...");
            this.initializeGameState();
            this.initializeTeams();
            this.initializeDownAndDistance();
            this.initializeRefereeSystem();
            this.createUIElements();
            console.log("[FlagFootball_ScoreManager] Initialized successfully");
        } catch (error) {
            console.error(`[FlagFootball_ScoreManager] Failed to initialize: ${error}`);
        }
    }

    private initializeGameState(): void {
        this.gameState = {
            isGameActive: false,
            isHalftime: false,
            isGameOver: false,
            currentQuarter: 1,
            timeRemaining: this.gameDurationMinutes * 60,
            gameClock: this.gameDurationMinutes * 60,
            playClock: 25
        };
        console.log("[FlagFootball_ScoreManager] Game state initialized");
    }

    private initializeTeams(): void {
        this.teams = {
            teamA: {
                players: [],
                score: 0,
                timeouts: 3,
                flags: []
            },
            teamB: {
                players: [],
                score: 0,
                timeouts: 3,
                flags: []
            }
        };
        console.log("[FlagFootball_ScoreManager] Team data initialized");
    }

    private initializeDownAndDistance(): void {
        if (this.fieldBounds) {
            const center = this.fieldBounds.center;
            this.downAndDistance = {
                currentDown: 1,
                yardsToGo: this.yardsForFirstDown,
                ballPosition: center.clone(),
                lineOfScrimmage: center.clone(),
                lineToGain: new Vector3(center.x, center.y, center.z + this.yardsForFirstDown),
                possession: 'teamA'
            };
        }
        console.log("[FlagFootball_ScoreManager] Down and distance initialized");
    }

    private initializeRefereeSystem(): void {
        this.refereeSystem = {
            designatedReferee: null,
            waitingForSpot: false,
            spotRequested: false,
            lastSpotPosition: new Vector3(0, 0, 0)
        };
        console.log("[FlagFootball_ScoreManager] Referee system initialized");
    }

    private createUIElements(): void {
        this.scoreboardUI = new UI();
        this.scoreboardUI.position = new Vector3(0, 2, -5);
        this.scoreboardUI.size = new Vector3(4, 2);
        this.updateScoreboardUI();
        
        this.downMarkerUI = new UI();
        this.downMarkerUI.position = new Vector3(0, 1.5, -3);
        this.downMarkerUI.size = new Vector3(2, 1);
        this.updateDownMarkerUI();
        
        console.log("[FlagFootball_ScoreManager] UI elements created");
    }

    public setFieldBoundaries(bounds: any): void {
        this.fieldBounds = bounds;
        console.log("[FlagFootball_ScoreManager] Field boundaries received");
        this.initializeDownAndDistance();
        this.updateDownMarkerUI();
    }

    public addPlayerToTeam(player: Player, team: string): boolean {
        if (!this.teams[team]) {
            console.error(`[FlagFootball_ScoreManager] Invalid team: ${team}`);
            return false;
        }

        if (this.teams[team].players.length >= this.maxPlayersPerTeam) {
            console.error(`[FlagFootball_ScoreManager] Team ${team} is full`);
            return false;
        }

        if (this.isPlayerOnTeam(player)) {
            console.error(`[FlagFootball_ScoreManager] Player already on a team`);
            return false;
        }

        this.teams[team].players.push(player);
        console.log(`[FlagFootball_ScoreManager] Player ${player.name} added to ${team}`);
        return true;
    }

    public removePlayerFromTeam(player: Player): boolean {
        let removed = false;
        const indexA = this.teams.teamA.players.findIndex((p: any) => p.id === player.id);
        if (indexA !== -1) {
            this.teams.teamA.players.splice(indexA, 1);
            removed = true;
        }
        const indexB = this.teams.teamB.players.findIndex((p: any) => p.id === player.id);
        if (indexB !== -1) {
            this.teams.teamB.players.splice(indexB, 1);
            removed = true;
        }
        if (removed) {
            console.log(`[FlagFootball_ScoreManager] Player ${player.name} removed from team`);
        }
        return removed;
    }

    public isPlayerOnTeam(player: Player): boolean {
        return this.teams.teamA.players.some((p: any) => p.id === player.id) ||
               this.teams.teamB.players.some((p: any) => p.id === player.id);
    }

    public setDesignatedReferee(player: Player): void {
        this.refereeSystem.designatedReferee = player;
        console.log(`[FlagFootball_ScoreManager] Player ${player.name} set as referee`);
    }

    public onFlagPull(position: Vector3, pullingPlayer: Player, pulledPlayer: Player): void {
        console.log(`[FlagFootball_ScoreManager] Flag pulled by ${pullingPlayer.name} on ${pulledPlayer.name}`);

        if (this.ManualSpotting && this.refereeSystem.designatedReferee) {
            this.refereeSystem.waitingForSpot = true;
            this.refereeSystem.spotRequested = true;
            this.refereeSystem.lastSpotPosition = position;
            console.log("[FlagFootball_ScoreManager] Waiting for referee to spot ball");
        } else {
            this.spotBall(position);
        }
    }

    public spotBall(position: Vector3): void {
        this.downAndDistance.ballPosition = position.clone();
        this.downAndDistance.lineOfScrimmage = position.clone();

        if (this.ManualSpotting) {
            this.refereeSystem.waitingForSpot = false;
            this.refereeSystem.spotRequested = false;
            this.refereeSystem.lastSpotPosition = position.clone();
        }

        this.updateLineToGain();
        this.advanceDown();
        
        console.log(`[FlagFootball_ScoreManager] Ball spotted at ${position.toString()}`);
        this.updateDownMarkerUI();
    }

    private updateLineToGain(): void {
        const possession = this.downAndDistance.possession;
        const lineOfScrimmage = this.downAndDistance.lineOfScrimmage;
        
        if (possession === 'teamA') {
            this.downAndDistance.lineToGain = new Vector3(
                lineOfScrimmage.x,
                lineOfScrimmage.y,
                lineOfScrimmage.z + this.yardsForFirstDown
            );
        } else {
            this.downAndDistance.lineToGain = new Vector3(
                lineOfScrimmage.x,
                lineOfScrimmage.y,
                lineOfScrimmage.z - this.yardsForFirstDown
            );
        }
    }

    private advanceDown(): void {
        this.downAndDistance.currentDown++;
        
        if (this.downAndDistance.currentDown > 4) {
            this.turnover();
        }
    }

    private turnover(): void {
        this.downAndDistance.possession = this.downAndDistance.possession === 'teamA' ? 'teamB' : 'teamA';
        this.downAndDistance.currentDown = 1;
        this.downAndDistance.yardsToGo = this.yardsForFirstDown;
        this.updateLineToGain();
        console.log(`[FlagFootball_ScoreManager] Turnover! ${this.downAndDistance.possession} now has possession`);
    }

    public addScore(team: string, points: number, scoringType: string): void {
        if (!this.teams[team]) {
            console.error(`[FlagFootball_ScoreManager] Invalid team: ${team}`);
            return;
        }

        this.teams[team].score += points;
        console.log(`[FlagFootball_ScoreManager] ${team} scored ${points} points (${scoringType})`);
        this.updateScoreboardUI();
    }

    public onTouchdown(team: string): void {
        this.addScore(team, this.touchdownPoints, "Touchdown");
        this.setupExtraPointAttempt(team);
    }

    private setupExtraPointAttempt(team: string): void {
        console.log(`[FlagFootball_ScoreManager] Extra point attempt setup for ${team}`);
    }

    private updateScoreboardUI(): void {
        if (!this.scoreboardUI) return;

        const scoreText = `Team A: ${this.teams.teamA.score} | Team B: ${this.teams.teamB.score}\n` +
                         `Quarter: ${this.gameState.currentQuarter} | Time: ${this.formatTime(this.gameState.timeRemaining)}`;
        
        this.scoreboardUI.text = scoreText;
    }

    private updateDownMarkerUI(): void {
        if (!this.downMarkerUI) return;

        const downText = `${this.downAndDistance.currentDown} & ${this.downAndDistance.yardsToGo}\n` +
                        `Possession: ${this.downAndDistance.possession}`;
        
        this.downMarkerUI.text = downText;
    }

    private formatTime(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    public startGame(): void {
        this.gameState.isGameActive = true;
        this.gameState.isGameOver = false;
        this.gameState.timeRemaining = this.gameDurationMinutes * 60;
        console.log("[FlagFootball_ScoreManager] Game started!");
    }

    public stopGame(): void {
        this.gameState.isGameActive = false;
        this.gameState.isGameOver = true;
        console.log("[FlagFootball_ScoreManager] Game stopped!");
    }

    public getGameState(): any {
        return {
            gameState: this.gameState,
            teams: this.teams,
            downAndDistance: this.downAndDistance,
            refereeSystem: this.refereeSystem
        };
    }

    public update(deltaTime: number): void {
        if (this.gameState.isGameActive && !this.gameState.isGameOver) {
            this.gameState.timeRemaining -= deltaTime;
            
            if (this.gameState.timeRemaining <= 0) {
                this.gameState.timeRemaining = 0;
                this.stopGame();
            }
            
            this.updateScoreboardUI();
        }
    }

    public onDestroy(): void {
        if (this.scoreboardUI) {
            this.scoreboardUI.destroy();
        }
        if (this.downMarkerUI) {
            this.downMarkerUI.destroy();
        }
        console.log("[FlagFootball_ScoreManager] Destroyed");
    }
}