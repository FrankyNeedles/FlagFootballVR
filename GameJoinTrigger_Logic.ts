import { Entity, Script, Player, UI, Trigger, Vector3, LocalPlayer } from 'horizon';

/**
 * GameJoinTrigger_Logic.ts
 * Purpose: Manages player joining and role selection for the Flag Football game.
 */
export class GameJoinTrigger_Logic extends Script {
    // Public Properties
    public triggerVolume: Trigger | null = null;
    public joinUIPosition: Vector3 = new Vector3(0, 1.5, 0);
    public maxPlayersPerTeam: number = 7;
    public maxReferees: number = 1;
    public spectatorFlightHeight: number = 50;
    public teamAColor: Vector3 = new Vector3(1, 0, 0);
    public teamBColor: Vector3 = new Vector3(0, 0, 1);

    // Player Role Enumeration
    public PlayerRole: any = {
        TeamA: "Team A",
        TeamB: "Team B",
        Referee: "Referee",
        Spectator: "Spectator"
    };

    // Player Management
    private playerRoles: Map<string, string> = new Map();
    private originalPlayerStates: Map<string, any> = new Map();

    // UI Elements
    private joinUI: UI | null = null;
    private roleSelectionUI: UI | null = null;
    private spectatorControlsUI: UI | null = null;

    // Game System References
    private scoreManager: any = null;
    private flagGizmo: any = null;

    // State
    private isInitialized: boolean = false;
    private playersInTrigger: Set<string> = new Set();

    public async start(): Promise<void> {
        try {
            console.log("[GameJoinTrigger_Logic] Starting...");
            this.initializeGameSystemReferences();
            this.setupTriggerEvents();
            this.createUIElements();
            this.isInitialized = true;
            console.log("[GameJoinTrigger_Logic] Initialized successfully");
        } catch (error) {
            console.error(`[GameJoinTrigger_Logic] Failed to initialize: ${error}`);
        }
    }

    private initializeGameSystemReferences(): void {
        this.scoreManager = GameObject.findObjectOfType("FlagFootball_ScoreManager");
        this.flagGizmo = GameObject.findObjectOfType("FlagFootball_Gizmo");
        console.log("[GameJoinTrigger_Logic] Game system references initialized");
    }

    private setupTriggerEvents(): void {
        if (!this.triggerVolume) {
            console.error("[GameJoinTrigger_Logic] Trigger volume not assigned");
            return;
        }

        this.triggerVolume.onEnter.add((player: Player) => {
            this.onPlayerEnterTrigger(player);
        });

        this.triggerVolume.onExit.add((player: Player) => {
            this.onPlayerExitTrigger(player);
        });

        console.log("[GameJoinTrigger_Logic] Trigger events setup complete");
    }

    private createUIElements(): void {
        this.joinUI = new UI();
        this.joinUI.position = this.joinUIPosition;
        this.joinUI.size = new Vector3(3, 2);
        this.joinUI.text = "Enter to Join Game";
        this.joinUI.visible = false;

        this.roleSelectionUI = new UI();
        this.roleSelectionUI.position = new Vector3(0, 2, 0);
        this.roleSelectionUI.size = new Vector3(4, 3);
        this.roleSelectionUI.visible = false;

        this.spectatorControlsUI = new UI();
        this.spectatorControlsUI.position = new Vector3(0, 1, 0);
        this.spectatorControlsUI.size = new Vector3(3, 2);
        this.spectatorControlsUI.visible = false;

        console.log("[GameJoinTrigger_Logic] UI elements created");
    }

    private onPlayerEnterTrigger(player: Player): void {
        const playerId = player.id;
        
        if (this.playersInTrigger.has(playerId)) {
            return;
        }

        this.playersInTrigger.add(playerId);
        console.log(`[GameJoinTrigger_Logic] Player ${player.name} entered join trigger`);

        if (player.isLocal) {
            this.showJoinUI();
        }
    }

    private onPlayerExitTrigger(player: Player): void {
        const playerId = player.id;
        
        if (!this.playersInTrigger.has(playerId)) {
            return;
        }

        this.playersInTrigger.delete(playerId);
        console.log(`[GameJoinTrigger_Logic] Player ${player.name} exited join trigger`);

        if (player.isLocal) {
            this.hideAllUI();
        }
    }

    private showJoinUI(): void {
        if (!this.joinUI) return;

        this.joinUI.visible = true;
        this.joinUI.text = "Press E to Join Game\n" +
                          "Current Players:\n" +
                          this.getPlayerCountText();
    }

    private showRoleSelectionUI(): void {
        if (!this.roleSelectionUI) return;

        const roleOptions = this.getAvailableRoleOptions();
        
        this.roleSelectionUI.text = "Select Your Role:\n\n" +
                                  roleOptions.map((option: any, index: number) => 
                                      `${index + 1}. ${option.role} (${option.status})`
                                  ).join('\n') +
                                  "\n\nPress number to select";
        
        this.roleSelectionUI.visible = true;
    }

    private getAvailableRoleOptions(): Array<{role: string, status: string}> {
        const teamACount = this.getPlayerCountByRole(this.PlayerRole.TeamA);
        const teamBCount = this.getPlayerCountByRole(this.PlayerRole.TeamB);
        const refereeCount = this.getPlayerCountByRole(this.PlayerRole.Referee);

        return [
            {
                role: this.PlayerRole.TeamA,
                status: `${teamACount}/${this.maxPlayersPerTeam} players`
            },
            {
                role: this.PlayerRole.TeamB,
                status: `${teamBCount}/${this.maxPlayersPerTeam} players`
            },
            {
                role: this.PlayerRole.Referee,
                status: `${refereeCount}/${this.maxReferees} referees`
            },
            {
                role: this.PlayerRole.Spectator,
                status: "Unlimited"
            }
        ];
    }

    private getPlayerCountText(): string {
        const teamACount = this.getPlayerCountByRole(this.PlayerRole.TeamA);
        const teamBCount = this.getPlayerCountByRole(this.PlayerRole.TeamB);
        const refereeCount = this.getPlayerCountByRole(this.PlayerRole.Referee);
        const spectatorCount = this.getPlayerCountByRole(this.PlayerRole.Spectator);

        return `Team A: ${teamACount}/${this.maxPlayersPerTeam}\n` +
               `Team B: ${teamBCount}/${this.maxPlayersPerTeam}\n` +
               `Referees: ${refereeCount}/${this.maxReferees}\n` +
               `Spectators: ${spectatorCount}`;
    }

    private getPlayerCountByRole(role: string): number {
        let count = 0;
        for (const playerRole of this.playerRoles.values()) {
            if (playerRole === role) {
                count++;
            }
        }
        return count;
    }

    public onPlayerInput(player: Player, input: string): void {
        if (!player.isLocal) return;

        const playerId = player.id;

        if (input === "E" && this.playersInTrigger.has(playerId)) {
            this.showRoleSelectionUI();
            return;
        }

        if (this.roleSelectionUI && this.roleSelectionUI.visible) {
            this.handleRoleSelection(player, input);
        }

        if (this.spectatorControlsUI && this.spectatorControlsUI.visible) {
            this.handleSpectatorControls(player, input);
        }
    }

    private handleRoleSelection(player: Player, input: string): void {
        const roleOptions = this.getAvailableRoleOptions();
        const selection = parseInt(input);

        if (isNaN(selection) || selection < 1 || selection > roleOptions.length) {
            return;
        }

        const selectedRole = roleOptions[selection - 1].role;
        this.assignRoleToPlayer(player, selectedRole);
    }

    private assignRoleToPlayer(player: Player, role: string): boolean {
        const playerId = player.id;

        if (this.playerRoles.has(playerId)) {
            console.error(`[GameJoinTrigger_Logic] Player ${player.name} already has role`);
            return false;
        }

        if (!this.isRoleAvailable(role)) {
            console.error(`[GameJoinTrigger_Logic] Role ${role} is not available`);
            return false;
        }

        this.storeOriginalPlayerState(player);
        this.playerRoles.set(playerId, role);
        this.applyRoleSettings(player, role);
        this.updateGameSystems(player, role);
        this.hideAllUI();

        console.log(`[GameJoinTrigger_Logic] Player ${player.name} assigned role: ${role}`);
        return true;
    }

    private isRoleAvailable(role: string): boolean {
        const count = this.getPlayerCountByRole(role);

        switch (role) {
            case this.PlayerRole.TeamA:
            case this.PlayerRole.TeamB:
                return count < this.maxPlayersPerTeam;
            case this.PlayerRole.Referee:
                return count < this.maxReferees;
            case this.PlayerRole.Spectator:
                return true;
            default:
                return false;
        }
    }

    private storeOriginalPlayerState(player: Player): void {
        const originalState = {
            position: player.getPosition(),
            rotation: player.getRotation(),
            canFly: player.canFly,
            collisionEnabled: player.collisionEnabled
        };

        this.originalPlayerStates.set(player.id, originalState);
    }

    private applyRoleSettings(player: Player, role: string): void {
        switch (role) {
            case this.PlayerRole.TeamA:
                this.applyTeamSettings(player, "teamA", this.teamAColor);
                break;
            case this.PlayerRole.TeamB:
                this.applyTeamSettings(player, "teamB", this.teamBColor);
                break;
            case this.PlayerRole.Referee:
                this.applyRefereeSettings(player);
                break;
            case this.PlayerRole.Spectator:
                this.applySpectatorSettings(player);
                break;
        }
    }

    private applyTeamSettings(player: Player, team: string, color: Vector3): void {
        player.setMaterialColor(color);
        player.collisionEnabled = true;
        player.canFly = false;

        if (this.flagGizmo && this.flagGizmo.attachFlagsToPlayer) {
            this.flagGizmo.attachFlagsToPlayer(player, team);
        }

        console.log(`[GameJoinTrigger_Logic] Applied ${team} settings to ${player.name}`);
    }

    private applyRefereeSettings(player: Player): void {
        player.setMaterialColor(new Vector3(1, 1, 1));
        player.collisionEnabled = true;
        player.canFly = true;

        if (this.scoreManager && this.scoreManager.setDesignatedReferee) {
            this.scoreManager.setDesignatedReferee(player);
        }

        console.log(`[GameJoinTrigger_Logic] Applied referee settings to ${player.name}`);
    }

    private applySpectatorSettings(player: Player): void {
        player.setMaterialColor(new Vector3(0.5, 0.5, 0.5));
        player.collisionEnabled = false;
        player.canFly = true;
        this.moveSpectatorToStand(player);

        if (player.isLocal) {
            this.showSpectatorControls();
        }

        console.log(`[GameJoinTrigger_Logic] Applied spectator settings to ${player.name}`);
    }

    private moveSpectatorToStand(player: Player): void {
        const currentPos = player.getPosition();
        const spectatorPos = new Vector3(
            currentPos.x,
            currentPos.y + this.spectatorFlightHeight,
            currentPos.z
        );

        player.setPosition(spectatorPos);
        console.log(`[GameJoinTrigger_Logic] Moved ${player.name} to spectator position`);
    }

    private showSpectatorControls(): void {
        if (!this.spectatorControlsUI) return;

        this.spectatorControlsUI.text = "Spectator Mode\n" +
                                       "WASD: Move\n" +
                                       "Space/Shift: Up/Down\n" +
                                       "F: Toggle Flight\n" +
                                       "ESC: Exit Spectator";
        
        this.spectatorControlsUI.visible = true;
    }

    private handleSpectatorControls(player: Player, input: string): void {
        if (input === "F") {
            player.canFly = !player.canFly;
            console.log(`[GameJoinTrigger_Logic] Flight ${player.canFly ? 'enabled' : 'disabled'} for spectator ${player.name}`);
        }

        if (input === "ESC") {
            this.removePlayerFromGame(player);
        }
    }

    private updateGameSystems(player: Player, role: string): void {
        if (this.scoreManager) {
            switch (role) {
                case this.PlayerRole.TeamA:
                    this.scoreManager.addPlayerToTeam(player, 'teamA');
                    break;
                case this.PlayerRole.TeamB:
                    this.scoreManager.addPlayerToTeam(player, 'teamB');
                    break;
            }
        }

        this.updateJoinUI();
    }

    public removePlayerFromGame(player: Player): void {
        const playerId = player.id;
        const role = this.playerRoles.get(playerId);

        if (!role) return;

        if (this.scoreManager && (role === this.PlayerRole.TeamA || role === this.PlayerRole.TeamB)) {
            this.scoreManager.removePlayerFromTeam(player);
        }

        if (this.flagGizmo && (role === this.PlayerRole.TeamA || role === this.PlayerRole.TeamB)) {
            this.flagGizmo.removeFlagsFromPlayer(player);
        }

        this.restoreOriginalPlayerState(player);
        this.playerRoles.delete(playerId);
        this.originalPlayerStates.delete(playerId);

        if (player.isLocal) {
            this.hideAllUI();
        }

        console.log(`[GameJoinTrigger_Logic] Player ${player.name} removed from game (was ${role})`);
    }

    private restoreOriginalPlayerState(player: Player): void {
        const originalState = this.originalPlayerStates.get(player.id);
        
        if (originalState) {
            player.setPosition(originalState.position);
            player.setRotation(originalState.rotation);
            player.canFly = originalState.canFly;
            player.collisionEnabled = originalState.collisionEnabled;
        }
    }

    private updateJoinUI(): void {
        if (this.joinUI && this.joinUI.visible) {
            this.showJoinUI();
        }
    }

    private hideAllUI(): void {
        if (this.joinUI) this.joinUI.visible = false;
        if (this.roleSelectionUI) this.roleSelectionUI.visible = false;
        if (this.spectatorControlsUI) this.spectatorControlsUI.visible = false;
    }

    public getPlayerRole(player: Player): string | null {
        return this.playerRoles.get(player.id) || null;
    }

    public getPlayersByRole(role: string): Player[] {
        const players: Player[] = [];
        
        for (const [playerId, playerRole] of this.playerRoles.entries()) {
            if (playerRole === role) {
                const player = Player.getPlayerById(playerId);
                if (player) {
                    players.push(player);
                }
            }
        }
        
        return players;
    }

    public isSpectator(player: Player): boolean {
        return this.playerRoles.get(player.id) === this.PlayerRole.Spectator;
    }

    public canPlayerInteractWithBall(player: Player): boolean {
        const role = this.playerRoles.get(player.id);
        return role === this.PlayerRole.TeamA || role === this.PlayerRole.TeamB;
    }

    public update(deltaTime: number): void {
        if (!this.isInitialized) return;

        if (this.joinUI || this.roleSelectionUI || this.spectatorControlsUI) {
            this.updateUIPositions();
        }
    }

    private updateUIPositions(): void {
        const localPlayer = LocalPlayer.getCurrent();
        if (!localPlayer) return;

        const playerPos = localPlayer.getPosition();
        const forward = localPlayer.getForward();
        const uiOffset = Vector3.add(playerPos, Vector3.multiply(forward, 2));
        
        if (this.joinUI && this.joinUI.visible) {
            this.joinUI.position = uiOffset;
        }
        
        if (this.roleSelectionUI && this.roleSelectionUI.visible) {
            this.roleSelectionUI.position = Vector3.add(uiOffset, Vector3.multiply(forward, 0.5));
        }
        
        if (this.spectatorControlsUI && this.spectatorControlsUI.visible) {
            this.spectatorControlsUI.position = Vector3.add(uiOffset, Vector3.multiply(forward, 1));
        }
    }

    public onDestroy(): void {
        for (const player of Player.getAllPlayers()) {
            this.removePlayerFromGame(player);
        }

        if (this.joinUI) this.joinUI.destroy();
        if (this.roleSelectionUI) this.roleSelectionUI.destroy();
        if (this.spectatorControlsUI) this.spectatorControlsUI.destroy();

        this.playerRoles.clear();
        this.originalPlayerStates.clear();
        this.playersInTrigger.clear();

        console.log("[GameJoinTrigger_Logic] Destroyed");
    }
}