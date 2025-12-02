import { Entity, Script, Player, Vector3, UI, Material, Color, Collider } from 'horizon';

/**
 * TargetPractice_Manager.ts
 * Purpose: Manages the Quarterback practice mode with target spawning and scoring.
 */
export class TargetPractice_Manager extends Script {
    // Public Properties
    public footballEntity: Entity | null = null;
    public targetPrefab: Entity | null = null;
    public practiceAreaCenter: Vector3 = new Vector3(0, 0, 0);
    public practiceAreaWidth: number = 30;
    public practiceAreaLength: number = 50;
    public targetSpawnInterval: number = 3.0;
    public targetIdleTimeout: number = 5.0;
    public maxActiveTargets: number = 3;
    public baseScorePerHit: number = 100;
    public distanceMultiplier: number = 2.0;
    public speedMultiplier: number = 1.5;

    // Target Management
    private activeTargets: TargetData[] = [];
    private targetPool: Entity[] = [];
    private lastSpawnTime: number = 0;
    private practiceModeActive: boolean = false;

    // Scoring System
    private currentScore: number = 0;
    private consecutiveHits: number = 0;
    private totalThrows: number = 0;
    private successfulHits: number = 0;

    // UI Elements
    private practiceUI: UI | null = null;
    private scoreUI: UI | null = null;

    // Events
    public onTargetHit: ((target: TargetData, score: number) => void) | null = null;
    public onTargetMissed: ((target: TargetData) => void) | null = null;
    public onPracticeModeChanged: ((active: boolean) => void) | null = null;

    interface TargetData {
        entity: Entity;
        position: Vector3;
        spawnTime: number;
        lastHitTime: number;
        isHit: boolean;
        distance: number;
        points: number;
        targetId: string;
        idleStartTime: number;
    }

    public async start(): Promise<void> {
        try {
            console.log("[TargetPractice_Manager] Starting...");
            this.initializeTargetPool();
            this.createUIElements();
            this.setupFootballCollision();
            console.log("[TargetPractice_Manager] Initialized successfully");
        } catch (error) {
            console.error(`[TargetPractice_Manager] Failed to initialize: ${error}`);
        }
    }

    private initializeTargetPool(): void {
        if (!this.targetPrefab) {
            console.error("[TargetPractice_Manager] Target prefab not assigned");
            return;
        }

        const poolSize = this.maxActiveTargets + 2;
        
        for (let i = 0; i < poolSize; i++) {
            const target = this.targetPrefab.clone();
            target.setPosition(new Vector3(0, -100, 0));
            target.setEnabled(false);
            this.targetPool.push(target);
        }

        console.log(`[TargetPractice_Manager] Target pool initialized with ${poolSize} targets`);
    }

    private createUIElements(): void {
        this.practiceUI = new UI();
        this.practiceUI.position = new Vector3(0, 2, -5);
        this.practiceUI.size = new Vector3(4, 2);
        this.updatePracticeUI();

        this.scoreUI = new UI();
        this.scoreUI.position = new Vector3(0, 1, -3);
        this.scoreUI.size = new Vector3(3, 1.5);
        this.updateScoreUI();

        console.log("[TargetPractice_Manager] UI elements created");
    }

    private setupFootballCollision(): void {
        if (!this.footballEntity) {
            console.error("[TargetPractice_Manager] Football entity not assigned");
            return;
        }

        const footballCollider = this.footballEntity.getComponent(Collider);
        if (footballCollider && footballCollider.onCollisionEnter) {
            footballCollider.onCollisionEnter.add((otherEntity: Entity) => {
                this.onFootballCollision(otherEntity);
            });
        }

        console.log("[TargetPractice_Manager] Football collision setup complete");
    }

    public startPracticeMode(): void {
        if (this.practiceModeActive) {
            console.warn("[TargetPractice_Manager] Practice mode already active");
            return;
        }

        this.practiceModeActive = true;
        this.resetScore();
        this.lastSpawnTime = Date.now() / 1000;

        console.log("[TargetPractice_Manager] Practice mode started");
        
        if (this.onPracticeModeChanged) {
            this.onPracticeModeChanged(true);
        }

        this.updatePracticeUI();
    }

    public stopPracticeMode(): void {
        if (!this.practiceModeActive) {
            console.warn("[TargetPractice_Manager] Practice mode not active");
            return;
        }

        this.practiceModeActive = false;
        this.clearAllTargets();

        console.log("[TargetPractice_Manager] Practice mode stopped");
        
        if (this.onPracticeModeChanged) {
            this.onPracticeModeChanged(false);
        }

        this.updatePracticeUI();
    }

    private resetScore(): void {
        this.currentScore = 0;
        this.consecutiveHits = 0;
        this.totalThrows = 0;
        this.successfulHits = 0;
        this.updateScoreUI();
    }

    private getTargetFromPool(): Entity | null {
        for (const target of this.targetPool) {
            if (!target.isEnabled()) {
                target.setEnabled(true);
                return target;
            }
        }
        
        console.error("[TargetPractice_Manager] No available targets in pool");
        return null;
    }

    private returnTargetToPool(target: Entity): void {
        target.setPosition(new Vector3(0, -100, 0));
        target.setEnabled(false);
    }

    private generateTargetPosition(): Vector3 {
        const randomX = this.practiceAreaCenter.x + (Math.random() - 0.5) * this.practiceAreaWidth;
        const randomZ = this.practiceAreaCenter.z + (Math.random() - 0.5) * this.practiceAreaLength;
        const targetHeight = 1.5;

        return new Vector3(randomX, targetHeight, randomZ);
    }

    private spawnTarget(): void {
        if (this.activeTargets.length >= this.maxActiveTargets) {
            return;
        }

        const targetEntity = this.getTargetFromPool();
        if (!targetEntity) return;

        const position = this.generateTargetPosition();
        const distance = Vector3.distance(this.practiceAreaCenter, position);
        const currentTime = Date.now() / 1000;

        const targetData: TargetData = {
            entity: targetEntity,
            position: position,
            spawnTime: currentTime,
            lastHitTime: 0,
            isHit: false,
            distance: distance,
            points: this.calculateTargetPoints(distance),
            targetId: `target_${currentTime}`,
            idleStartTime: currentTime
        };

        targetEntity.setPosition(position);
        this.applyDistanceColoring(targetEntity, distance);
        this.activeTargets.push(targetData);

        console.log(`[TargetPractice_Manager] Target spawned at distance ${distance.toFixed(1)} yards`);
    }

    private calculateTargetPoints(distance: number): number {
        return Math.floor(this.baseScorePerHit + (distance * this.distanceMultiplier));
    }

    private applyDistanceColoring(target: Entity, distance: number): void {
        const maxDistance = this.practiceAreaLength / 2;
        const normalizedDistance = Math.min(distance / maxDistance, 1.0);

        const red = normalizedDistance;
        const green = 1.0 - normalizedDistance;
        const blue = 0.0;

        const targetMaterial = new Material();
        targetMaterial.setAlbedoColor(new Color(red, green, blue));
        target.setMaterial(targetMaterial);
    }

    private onFootballCollision(otherEntity: Entity): void {
        if (!this.practiceModeActive) return;

        const hitTarget = this.activeTargets.find(target => 
            target.entity.id === otherEntity.id && !target.isHit
        );

        if (hitTarget) {
            this.onTargetHitHandler(hitTarget);
        }
    }

    private onTargetHitHandler(target: TargetData): void {
        const currentTime = Date.now() / 1000;
        
        target.isHit = true;
        target.lastHitTime = currentTime;

        const timeToHit = currentTime - target.spawnTime;
        const speedBonus = Math.max(0, this.speedMultiplier * (this.targetIdleTimeout - timeToHit));
        const totalScore = target.points + Math.floor(speedBonus);

        this.currentScore += totalScore;
        this.consecutiveHits++;
        this.successfulHits++;
        this.totalThrows++;

        this.showHitFeedback(target, totalScore);
        this.scheduleTargetRemoval(target, 0.5);

        console.log(`[TargetPractice_Manager] Target hit! Score: ${totalScore}`);

        if (this.onTargetHit) {
            this.onTargetHit(target, totalScore);
        }

        this.updateScoreUI();
    }

    private showHitFeedback(target: TargetData, score: number): void {
        const scorePopup = new UI();
        scorePopup.position = Vector3.add(target.position, new Vector3(0, 2, 0));
        scorePopup.size = new Vector3(1, 0.5);
        scorePopup.text = `+${score}`;
        scorePopup.color = new Color(0, 1, 0);

        this.animateScorePopup(scorePopup);
    }

    private animateScorePopup(popup: UI): void {
        let animationTime = 0;
        const animationDuration = 1.0;

        const animate = () => {
            animationTime += 0.016;
            
            if (animationTime >= animationDuration) {
                popup.destroy();
                return;
            }

            const currentPos = popup.position;
            popup.position = new Vector3(currentPos.x, currentPos.y + 0.05, currentPos.z);
            
            const alpha = 1.0 - (animationTime / animationDuration);
            popup.color = new Color(0, 1, 0, alpha);

            setTimeout(animate, 16);
        };

        animate();
    }

    private scheduleTargetRemoval(target: TargetData, delay: number): void {
        setTimeout(() => {
            this.removeTarget(target);
        }, delay * 1000);
    }

    private removeTarget(target: TargetData): void {
        const index = this.activeTargets.findIndex(t => t.targetId === target.targetId);
        if (index !== -1) {
            this.activeTargets.splice(index, 1);
            this.returnTargetToPool(target.entity);
        }
    }

    private checkIdleTargets(): void {
        const currentTime = Date.now() / 1000;

        for (const target of this.activeTargets) {
            if (target.isHit) continue;

            const idleTime = currentTime - target.idleStartTime;
            
            if (idleTime >= this.targetIdleTimeout) {
                this.onTargetIdleTimeout(target);
            }
        }
    }

    private onTargetIdleTimeout(target: TargetData): void {
        console.log(`[TargetPractice_Manager] Target timed out`);

        this.consecutiveHits = 0;
        this.totalThrows++;

        this.showMissFeedback(target);
        this.removeTarget(target);

        if (this.onTargetMissed) {
            this.onTargetMissed(target);
        }

        this.updateScoreUI();
    }

    private showMissFeedback(target: TargetData): void {
        const missIndicator = new UI();
        missIndicator.position = Vector3.add(target.position, new Vector3(0, 2, 0));
        missIndicator.size = new Vector3(1, 0.5);
        missIndicator.text = "MISSED!";
        missIndicator.color = new Color(1, 0, 0);

        setTimeout(() => {
            missIndicator.destroy();
        }, 1000);
    }

    private clearAllTargets(): void {
        for (const target of this.activeTargets) {
            this.returnTargetToPool(target.entity);
        }
        this.activeTargets = [];
    }

    private updatePracticeUI(): void {
        if (!this.practiceUI) return;

        const status = this.practiceModeActive ? "ACTIVE" : "INACTIVE";
        const instruction = this.practiceModeActive ? 
            "Throw the football at the targets!" : 
            "Press 'P' to start practice mode";

        this.practiceUI.text = `Target Practice: ${status}\n${instruction}`;
    }

    private updateScoreUI(): void {
        if (!this.scoreUI) return;

        const accuracy = this.totalThrows > 0 ? 
            ((this.successfulHits / this.totalThrows) * 100).toFixed(1) : "0.0";

        this.scoreUI.text = `Score: ${this.currentScore}\n` +
                           `Accuracy: ${accuracy}%\n` +
                           `Streak: ${this.consecutiveHits}`;
    }

    public onPlayerInput(player: Player, input: string): void {
        if (!player.isLocal) return;

        if (input === "P") {
            if (this.practiceModeActive) {
                this.stopPracticeMode();
            } else {
                this.startPracticeMode();
            }
        }
    }

    public getCurrentStats(): any {
        return {
            score: this.currentScore,
            consecutiveHits: this.consecutiveHits,
            totalThrows: this.totalThrows,
            successfulHits: this.successfulHits,
            accuracy: this.totalThrows > 0 ? 
                ((this.successfulHits / this.totalThrows) * 100) : 0,
            activeTargets: this.activeTargets.length
        };
    }

    public update(deltaTime: number): void {
        if (!this.practiceModeActive) return;

        const currentTime = Date.now() / 1000;

        if (currentTime - this.lastSpawnTime >= this.targetSpawnInterval) {
            this.spawnTarget();
            this.lastSpawnTime = currentTime;
        }

        this.checkIdleTargets();
    }

    public onDestroy(): void {
        this.stopPracticeMode();

        if (this.practiceUI) this.practiceUI.destroy();
        if (this.scoreUI) this.scoreUI.destroy();

        for (const target of this.targetPool) {
            target.destroy();
        }
        this.targetPool = [];

        this.activeTargets = [];

        console.log("[TargetPractice_Manager] Destroyed");
    }
}