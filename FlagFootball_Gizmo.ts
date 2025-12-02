import { Entity, Script, Player, Vector3, Material, Color, Collider } from 'horizon';

/**
 * FlagFootball_Gizmo.ts
 * Purpose: Manages flag entities and player flag attachments for 7v7 Flag Football.
 */
export class FlagFootball_Gizmo extends Script {
    // Public Properties
    public flagPrefab: Entity | null = null;
    public flagAttachmentOffset: Vector3 = new Vector3(0.3, 0, 0);
    public flagPullDistance: number = 0.5;
    public teamAFlagColor: Color = new Color(1, 0, 0);
    public teamBFlagColor: Color = new Color(0, 0, 1);
    public maxPlayersSupported: number = 14;
    public flagRespawnTime: number = 2.0;

    // Flag Management
    private playerFlags: Map<string, PlayerFlagData> = new Map();
    private flagPool: Entity[] = [];

    // Materials for team colors
    private teamAMaterial: Material | null = null;
    private teamBMaterial: Material | null = null;

    // Performance tracking
    private lastUpdateTime: number = 0;
    private updateInterval: number = 0.1;

    // Events
    public onFlagPulled: ((pullingPlayer: Player, pulledPlayer: Player, flagPosition: Vector3) => void) | null = null;

    interface PlayerFlagData {
        player: Player;
        team: string;
        leftFlag: Entity | null;
        rightFlag: Entity | null;
        isLeftFlagPulled: boolean;
        isRightFlagPulled: boolean;
        lastPullTime: number;
        flagPositions: {
            left: Vector3;
            right: Vector3;
        };
    }

    public async start(): Promise<void> {
        try {
            console.log("[FlagFootball_Gizmo] Starting...");
            this.initializeMaterials();
            this.initializeFlagPool();
            console.log("[FlagFootball_Gizmo] Initialized successfully");
        } catch (error) {
            console.error(`[FlagFootball_Gizmo] Failed to initialize: ${error}`);
        }
    }

    private initializeMaterials(): void {
        this.teamAMaterial = new Material();
        this.teamAMaterial.setAlbedoColor(this.teamAFlagColor);
        this.teamAMaterial.setMetallic(0.2);
        this.teamAMaterial.setRoughness(0.8);

        this.teamBMaterial = new Material();
        this.teamBMaterial.setAlbedoColor(this.teamBFlagColor);
        this.teamBMaterial.setMetallic(0.2);
        this.teamBMaterial.setRoughness(0.8);

        console.log("[FlagFootball_Gizmo] Team materials initialized");
    }

    private initializeFlagPool(): void {
        if (!this.flagPrefab) {
            console.error("[FlagFootball_Gizmo] Flag prefab not assigned");
            return;
        }

        const poolSize = this.maxPlayersSupported * 2;
        
        for (let i = 0; i < poolSize; i++) {
            const flag = this.flagPrefab.clone();
            flag.setPosition(new Vector3(0, -100, 0));
            flag.setEnabled(false);
            this.flagPool.push(flag);
        }

        console.log(`[FlagFootball_Gizmo] Flag pool initialized with ${poolSize} flags`);
    }

    private getFlagFromPool(): Entity | null {
        for (const flag of this.flagPool) {
            if (!flag.isEnabled()) {
                flag.setEnabled(true);
                return flag;
            }
        }
        
        console.error("[FlagFootball_Gizmo] No available flags in pool");
        return null;
    }

    private returnFlagToPool(flag: Entity): void {
        flag.setPosition(new Vector3(0, -100, 0));
        flag.setEnabled(false);
    }

    public attachFlagsToPlayer(player: Player, team: string): boolean {
        const playerId = player.id;

        if (this.playerFlags.has(playerId)) {
            console.error(`[FlagFootball_Gizmo] Player ${player.name} already has flags`);
            return false;
        }

        if (this.playerFlags.size >= this.maxPlayersSupported) {
            console.error(`[FlagFootball_Gizmo] Maximum players reached`);
            return false;
        }

        const leftFlag = this.getFlagFromPool();
        const rightFlag = this.getFlagFromPool();

        if (!leftFlag || !rightFlag) {
            console.error("[FlagFootball_Gizmo] Failed to get flags from pool");
            return false;
        }

        const teamMaterial = team === 'teamA' ? this.teamAMaterial : this.teamBMaterial;
        if (teamMaterial) {
            leftFlag.setMaterial(teamMaterial);
            rightFlag.setMaterial(teamMaterial);
        }

        const playerPos = player.getPosition();
        const playerRight = player.getRight();
        const flagOffset = Vector3.multiply(playerRight, this.flagAttachmentOffset.x);

        const leftFlagPos = Vector3.subtract(playerPos, flagOffset);
        const rightFlagPos = Vector3.add(playerPos, flagOffset);

        leftFlag.setPosition(leftFlagPos);
        rightFlag.setPosition(rightFlagPos);

        const flagData: PlayerFlagData = {
            player: player,
            team: team,
            leftFlag: leftFlag,
            rightFlag: rightFlag,
            isLeftFlagPulled: false,
            isRightFlagPulled: false,
            lastPullTime: 0,
            flagPositions: {
                left: leftFlagPos,
                right: rightFlagPos
            }
        };

        this.playerFlags.set(playerId, flagData);

        leftFlag.setParent(player);
        rightFlag.setParent(player);

        console.log(`[FlagFootball_Gizmo] Attached ${team} flags to ${player.name}`);
        return true;
    }

    public removeFlagsFromPlayer(player: Player): boolean {
        const playerId = player.id;
        const flagData = this.playerFlags.get(playerId);

        if (!flagData) {
            console.error(`[FlagFootball_Gizmo] Player ${player.name} does not have flags`);
            return false;
        }

        if (flagData.leftFlag) {
            flagData.leftFlag.setParent(null);
            this.returnFlagToPool(flagData.leftFlag);
        }

        if (flagData.rightFlag) {
            flagData.rightFlag.setParent(null);
            this.returnFlagToPool(flagData.rightFlag);
        }

        this.playerFlags.delete(playerId);

        console.log(`[FlagFootball_Gizmo] Removed flags from ${player.name}`);
        return true;
    }

    public playerHasFlags(player: Player): boolean {
        return this.playerFlags.has(player.id);
    }

    public getPlayerTeam(player: Player): string | null {
        const flagData = this.playerFlags.get(player.id);
        return flagData ? flagData.team : null;
    }

    private updateFlagPositions(): void {
        const currentTime = Date.now() / 1000;

        for (const [playerId, flagData] of this.playerFlags.entries()) {
            if (!flagData.player.isValid()) {
                this.removeFlagsFromPlayer(flagData.player);
                continue;
            }

            if (!flagData.isLeftFlagPulled && flagData.leftFlag) {
                const playerPos = flagData.player.getPosition();
                const playerRight = flagData.player.getRight();
                const flagOffset = Vector3.multiply(playerRight, this.flagAttachmentOffset.x);
                const leftFlagPos = Vector3.subtract(playerPos, flagOffset);
                
                flagData.leftFlag.setPosition(leftFlagPos);
                flagData.flagPositions.left = leftFlagPos;
            }

            if (!flagData.isRightFlagPulled && flagData.rightFlag) {
                const playerPos = flagData.player.getPosition();
                const playerRight = flagData.player.getRight();
                const flagOffset = Vector3.multiply(playerRight, this.flagAttachmentOffset.x);
                const rightFlagPos = Vector3.add(playerPos, flagOffset);
                
                flagData.rightFlag.setPosition(rightFlagPos);
                flagData.flagPositions.right = rightFlagPos;
            }

            this.checkFlagPulls(flagData, currentTime);
            this.respawnPulledFlags(flagData, currentTime);
        }
    }

    private checkFlagPulls(flagData: PlayerFlagData, currentTime: number): void {
        const allPlayers = Player.getAllPlayers();

        for (const otherPlayer of allPlayers) {
            if (otherPlayer.id === flagData.player.id) continue;

            const otherTeam = this.getPlayerTeam(otherPlayer);
            if (!otherTeam || otherTeam === flagData.team) continue;

            const otherPlayerPos = otherPlayer.getPosition();

            if (!flagData.isLeftFlagPulled && flagData.leftFlag) {
                const distance = Vector3.distance(otherPlayerPos, flagData.flagPositions.left);
                if (distance < this.flagPullDistance) {
                    this.pullFlag(flagData, 'left', otherPlayer, currentTime);
                }
            }

            if (!flagData.isRightFlagPulled && flagData.rightFlag) {
                const distance = Vector3.distance(otherPlayerPos, flagData.flagPositions.right);
                if (distance < this.flagPullDistance) {
                    this.pullFlag(flagData, 'right', otherPlayer, currentTime);
                }
            }
        }
    }

    private pullFlag(flagData: PlayerFlagData, side: string, pullingPlayer: Player, currentTime: number): void {
        if (side === 'left') {
            flagData.isLeftFlagPulled = true;
            if (flagData.leftFlag) {
                flagData.leftFlag.setParent(null);
                const flagPos = flagData.flagPositions.left;
                flagData.leftFlag.setPosition(new Vector3(flagPos.x, 0, flagPos.z));
            }
        } else {
            flagData.isRightFlagPulled = true;
            if (flagData.rightFlag) {
                flagData.rightFlag.setParent(null);
                const flagPos = flagData.flagPositions.right;
                flagData.rightFlag.setPosition(new Vector3(flagPos.x, 0, flagPos.z));
            }
        }

        flagData.lastPullTime = currentTime;

        if (this.onFlagPulled) {
            const flagPosition = side === 'left' ? flagData.flagPositions.left : flagData.flagPositions.right;
            this.onFlagPulled(pullingPlayer, flagData.player, flagPosition);
        }

        console.log(`[FlagFootball_Gizmo] Flag pulled: ${pullingPlayer.name} pulled ${side} flag from ${flagData.player.name}`);
    }

    private respawnPulledFlags(flagData: PlayerFlagData, currentTime: number): void {
        const timeSincePull = currentTime - flagData.lastPullTime;

        if (timeSincePull >= this.flagRespawnTime) {
            let respawned = false;

            if (flagData.isLeftFlagPulled && flagData.leftFlag) {
                flagData.isLeftFlagPulled = false;
                flagData.leftFlag.setParent(flagData.player);
                respawned = true;
            }

            if (flagData.isRightFlagPulled && flagData.rightFlag) {
                flagData.isRightFlagPulled = false;
                flagData.rightFlag.setParent(flagData.player);
                respawned = true;
            }

            if (respawned) {
                console.log(`[FlagFootball_Gizmo] Flags respawned for ${flagData.player.name}`);
            }
        }
    }

    public getPlayersWithFlags(): Player[] {
        const players: Player[] = [];
        
        for (const flagData of this.playerFlags.values()) {
            if (flagData.player.isValid()) {
                players.push(flagData.player);
            }
        }
        
        return players;
    }

    public getPlayerFlagData(player: Player): PlayerFlagData | null {
        return this.playerFlags.get(player.id) || null;
    }

    public playerHasPulledFlags(player: Player): boolean {
        const flagData = this.playerFlags.get(player.id);
        if (!flagData) return false;
        
        return flagData.isLeftFlagPulled || flagData.isRightFlagPulled;
    }

    public getPlayerCountByTeam(): { teamA: number; teamB: number } {
        let teamACount = 0;
        let teamBCount = 0;

        for (const flagData of this.playerFlags.values()) {
            if (flagData.team === 'teamA') {
                teamACount++;
            } else {
                teamBCount++;
            }
        }

        return { teamA: teamACount, teamB: teamBCount };
    }

    public update(deltaTime: number): void {
        const currentTime = Date.now() / 1000;

        if (currentTime - this.lastUpdateTime < this.updateInterval) {
            return;
        }

        this.lastUpdateTime = currentTime;
        this.updateFlagPositions();
    }

    public onDestroy(): void {
        const playersToRemove: Player[] = [];
        
        for (const flagData of this.playerFlags.values()) {
            playersToRemove.push(flagData.player);
        }

        for (const player of playersToRemove) {
            this.removeFlagsFromPlayer(player);
        }

        for (const flag of this.flagPool) {
            flag.destroy();
        }
        this.flagPool = [];

        this.playerFlags.clear();

        console.log("[FlagFootball_Gizmo] Destroyed");
    }
}