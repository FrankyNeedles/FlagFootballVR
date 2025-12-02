import { Entity, Script, Player, Vector3, UI, LocalPlayer } from 'horizon';

/**
 * Spectator_Hud.ts
 * Purpose: Provides information display for spectators in Flag Football games.
 */
export class Spectator_Hud extends Script {
    // Public Properties
    public mainHudPosition: Vector3 = new Vector3(0, 1.5, -3);
    public scoreDisplayPosition: Vector3 = new Vector3(0, 2.5, -5);
    public controlsDisplayPosition: Vector3 = new Vector3(2, 1, -2);
    public hudUpdateInterval: number = 0.5;
    public showTeamColors: boolean = true;
    public teamAColor: Vector3 = new Vector3(1, 0, 0);
    public teamBColor: Vector3 = new Vector3(0, 0, 1);

    // UI Elements
    private mainHud: UI | null = null;
    private scoreDisplay: UI | null = null;
    private controlsDisplay: UI | null = null;
    private miniMap: UI | null = null;

    // State Management
    private isSpectator: boolean = false;
    private flightModeEnabled: boolean = false;
    private lastUpdateTime: number = 0;

    // Game System References
    private scoreManager: any = null;
    private gameJoinTrigger: any = null;

    // Spectator Settings
    private spectatorSettings: SpectatorSettings = {
        showDownMarker: true,
        showScore: true,
        showTimer: true,
        showPlayerNames: true,
        showTeamInfo: true,
        cameraMode: 'free',
        followPlayer: null
    };

    interface SpectatorSettings {
        showDownMarker: boolean;
        showScore: boolean;
        showTimer: boolean;
        showPlayerNames: boolean;
        showTeamInfo: boolean;
        cameraMode: 'free' | 'follow' | 'overview';
        followPlayer: Player | null;
    }

    public async start(): Promise<void> {
        try {
            console.log("[Spectator_Hud] Starting...");
            this.initializeGameSystemReferences();
            this.createUIElements();
            this.setupEventListeners();
            this.checkSpectatorStatus();
            console.log("[Spectator_Hud] Initialized successfully");
        } catch (error) {
            console.error(`[Spectator_Hud] Failed to initialize: ${error}`);
        }
    }

    private initializeGameSystemReferences(): void {
        this.scoreManager = GameObject.findObjectOfType("FlagFootball_ScoreManager");
        this.gameJoinTrigger = GameObject.findObjectOfType("GameJoinTrigger_Logic");
        console.log("[Spectator_Hud] Game system references initialized");
    }

    private createUIElements(): void {
        this.mainHud = new UI();
        this.mainHud.position = this.mainHudPosition;
        this.mainHud.size = new Vector3(3, 2);
        this.mainHud.visible = false;

        this.scoreDisplay = new UI();
        this.scoreDisplay.position = this.scoreDisplayPosition;
        this.scoreDisplay.size = new Vector3(4, 1.5);
        this.scoreDisplay.visible = false;

        this.controlsDisplay = new UI();
        this.controlsDisplay.position = this.controlsDisplayPosition;
        this.controlsDisplay.size = new Vector3(2.5, 2);
        this.controlsDisplay.visible = false;

        this.miniMap = new UI();
        this.miniMap.position = new Vector3(-2, 1.5, -2);
        this.miniMap.size = new Vector3(1.5, 1.5);
        this.miniMap.visible = false;

        console.log("[Spectator_Hud] UI elements created");
    }

    private setupEventListeners(): void {
        if (this.scoreManager && this.scoreManager.onScoreChanged) {
            this.scoreManager.onScoreChanged.add((team: string, score: number) => {
                this.updateScoreDisplay();
            });
        }

        if (this.scoreManager && this.scoreManager.onDownChanged) {
            this.scoreManager.onDownChanged.add((down: number, yardsToGo: number) => {
                this.updateMainHud();
            });
        }

        console.log("[Spectator_Hud] Event listeners setup complete");
    }

    private checkSpectatorStatus(): void {
        const localPlayer = LocalPlayer.getCurrent();
        if (!localPlayer) return;

        if (this.gameJoinTrigger && this.gameJoinTrigger.isSpectator) {
            this.isSpectator = this.gameJoinTrigger.isSpectator(localPlayer);
        }

        if (this.isSpectator) {
            this.enableSpectatorMode();
        }
    }

    public enableSpectatorMode(): void {
        this.isSpectator = true;
        
        if (this.mainHud) this.mainHud.visible = true;
        if (this.scoreDisplay) this.scoreDisplay.visible = true;
        if (this.controlsDisplay) this.controlsDisplay.visible = true;
        if (this.miniMap) this.miniMap.visible = true;

        this.flightModeEnabled = true;
        this.updateAllDisplays();

        console.log("[Spectator_Hud] Spectator mode enabled");
    }

    public disableSpectatorMode(): void {
        this.isSpectator = false;
        
        if (this.mainHud) this.mainHud.visible = false;
        if (this.scoreDisplay) this.scoreDisplay.visible = false;
        if (this.controlsDisplay) this.controlsDisplay.visible = false;
        if (this.miniMap) this.miniMap.visible = false;

        this.flightModeEnabled = false;

        console.log("[Spectator_Hud] Spectator mode disabled");
    }

    private updateAllDisplays(): void {
        this.updateMainHud();
        this.updateScoreDisplay();
        this.updateControlsDisplay();
        this.updateMiniMap();
    }

    private updateMainHud(): void {
        if (!this.mainHud || !this.isSpectator) return;

        let hudText = "=== SPECTATOR MODE ===\n";

        if (this.scoreManager) {
            const gameState = this.scoreManager.getGameState();
            
            if (gameState && gameState.downAndDistance) {
                const downInfo = gameState.downAndDistance;
                hudText += `Down: ${downInfo.currentDown} & ${downInfo.yardsToGo}\n`;
                hudText += `Possession: ${downInfo.possession}\n`;
            }

            if (gameState && gameState.gameState) {
                const gameInfo = gameState.gameState;
                if (this.spectatorSettings.showTimer) {
                    hudText += `Time: ${this.formatTime(gameInfo.timeRemaining)}\n`;
                }
                hudText += `Quarter: ${gameInfo.currentQuarter}\n`;
            }
        }

        hudText += `Flight: ${this.flightModeEnabled ? 'ON' : 'OFF'}`;

        this.mainHud.text = hudText;
    }

    private updateScoreDisplay(): void {
        if (!this.scoreDisplay || !this.isSpectator) return;

        let scoreText = "=== SCORE ===\n";

        if (this.scoreManager) {
            const gameState = this.scoreManager.getGameState();
            
            if (gameState && gameState.teams) {
                const teamA = gameState.teams.teamA;
                const teamB = gameState.teams.teamB;

                scoreText += `Team A: ${teamA.score}\n`;
                scoreText += `Team B: ${teamB.score}`;
            }
        }

        this.scoreDisplay.text = scoreText;
    }

    private updateControlsDisplay(): void {
        if (!this.controlsDisplay || !this.isSpectator) return;

        let controlsText = "=== CONTROLS ===\n";
        controlsText += "WASD: Move\n";
        controlsText += "Space/Shift: Up/Down\n";
        controlsText += "F: Toggle Flight\n";
        controlsText += "1-5: Camera Views\n";
        controlsText += "Tab: Follow Player\n";
        controlsText += "ESC: Exit Spectate\n";
        controlsText += `\nCamera: ${this.spectatorSettings.cameraMode}`;

        this.controlsDisplay.text = controlsText;
    }

    private updateMiniMap(): void {
        if (!this.miniMap || !this.isSpectator) return;

        this.miniMap.text = "MINI MAP\n[Field View]";
    }

    public toggleFlightMode(): void {
        if (!this.isSpectator) return;

        const localPlayer = LocalPlayer.getCurrent();
        if (localPlayer) {
            this.flightModeEnabled = !this.flightModeEnabled;
            localPlayer.canFly = this.flightModeEnabled;
            
            console.log(`[Spectator_Hud] Flight mode ${this.flightModeEnabled ? 'enabled' : 'disabled'}`);
            this.updateMainHud();
        }
    }

    public setCameraMode(mode: 'free' | 'follow' | 'overview'): void {
        if (!this.isSpectator) return;

        this.spectatorSettings.cameraMode = mode;
        this.applyCameraMode(mode);
        this.updateControlsDisplay();
        console.log(`[Spectator_Hud] Camera mode set to: ${mode}`);
    }

    private applyCameraMode(mode: 'free' | 'follow' | 'overview'): void {
        const localPlayer = LocalPlayer.getCurrent();
        if (!localPlayer) return;

        switch (mode) {
            case 'free':
                localPlayer.canFly = true;
                this.flightModeEnabled = true;
                break;
                
            case 'follow':
                if (this.spectatorSettings.followPlayer) {
                    console.log(`[Spectator_Hud] Following player: ${this.spectatorSettings.followPlayer.name}`);
                }
                break;
                
            case 'overview':
                const overviewPos = new Vector3(0, 50, 0);
                localPlayer.setPosition(overviewPos);
                localPlayer.canFly = false;
                this.flightModeEnabled = false;
                break;
        }
    }

    public setFollowPlayer(player: Player | null): void {
        if (!this.isSpectator) return;

        this.spectatorSettings.followPlayer = player;
        
        if (player) {
            this.setCameraMode('follow');
            console.log(`[Spectator_Hud] Now following player: ${player.name}`);
        } else {
            this.setCameraMode('free');
            console.log("[Spectator_Hud] Stopped following player");
        }
    }

    public onPlayerInput(player: Player, input: string): void {
        if (!this.isSpectator || !player.isLocal) return;

        switch (input) {
            case "F":
                this.toggleFlightMode();
                break;
                
            case "1":
                this.setCameraMode('free');
                break;
                
            case "2":
                this.setCameraMode('overview');
                break;
                
            case "3":
                this.setCameraMode('follow');
                break;
                
            case "Tab":
                this.cycleFollowPlayer();
                break;
                
            case "ESC":
                this.exitSpectatorMode();
                break;
        }
    }

    private cycleFollowPlayer(): void {
        if (!this.gameJoinTrigger) return;

        const teamAPlayers = this.gameJoinTrigger.getPlayersByRole("Team A");
        const teamBPlayers = this.gameJoinTrigger.getPlayersByRole("Team B");
        const allPlayers = [...teamAPlayers, ...teamBPlayers];

        if (allPlayers.length === 0) {
            console.log("[Spectator_Hud] No players available to follow");
            return;
        }

        let currentIndex = -1;
        if (this.spectatorSettings.followPlayer) {
            currentIndex = allPlayers.findIndex(p => p.id === this.spectatorSettings.followPlayer!.id);
        }

        const nextIndex = (currentIndex + 1) % allPlayers.length;
        this.setFollowPlayer(allPlayers[nextIndex]);
    }

    public exitSpectatorMode(): void {
        if (!this.isSpectator) return;

        const localPlayer = LocalPlayer.getCurrent();
        if (localPlayer && this.gameJoinTrigger) {
            this.gameJoinTrigger.removePlayerFromGame(localPlayer);
        }

        this.disableSpectatorMode();
    }

    private formatTime(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    public getSpectatorSettings(): SpectatorSettings {
        return { ...this.spectatorSettings };
    }

    public update(deltaTime: number): void {
        if (!this.isSpectator) return;

        const currentTime = Date.now() / 1000;

        if (currentTime - this.lastUpdateTime >= this.hudUpdateInterval) {
            this.lastUpdateTime = currentTime;
            this.updateAllDisplays();
        }

        this.updateUIPositions();
    }

    private updateUIPositions(): void {
        const localPlayer = LocalPlayer.getCurrent();
        if (!localPlayer) return;

        const playerPos = localPlayer.getPosition();

        if (this.mainHud) {
            this.mainHud.position = Vector3.add(playerPos, this.mainHudPosition);
        }
        
        if (this.scoreDisplay) {
            this.scoreDisplay.position = Vector3.add(playerPos, this.scoreDisplayPosition);
        }
        
        if (this.controlsDisplay) {
            this.controlsDisplay.position = Vector3.add(playerPos, this.controlsDisplayPosition);
        }
        
        if (this.miniMap) {
            this.miniMap.position = Vector3.add(playerPos, this.miniMap.position);
        }
    }

    public onDestroy(): void {
        if (this.mainHud) this.mainHud.destroy();
        if (this.scoreDisplay) this.scoreDisplay.destroy();
        if (this.controlsDisplay) this.controlsDisplay.destroy();
        if (this.miniMap) this.miniMap.destroy();

        console.log("[Spectator_Hud] Destroyed");
    }
}