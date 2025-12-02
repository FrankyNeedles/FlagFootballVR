import { Entity, Script, Player, Vector3, UI, Material, Color, Collider, Trigger } from 'horizon';

/**
 * Combine_ObstacleCourse.ts
 * Purpose: A race mode for athletic skills with checkpoints and throwing nets.
 */
export class Combine_ObstacleCourse extends Script {
    // Public Properties
    public courseStartPosition: Vector3 = new Vector3(0, 0, 0);
    public courseEndPosition: Vector3 = new Vector3(0, 0, 100);
    public checkpointPrefab: Entity | null = null;
    public throwingNet: Entity | null = null;
    public footballEntity: Entity | null = null;
    public numberOfCheckpoints: number = 5;
    public checkpointSpacing: number = 20;
    public courseTimeLimit: number = 120;
    public ballThrowDistance: number = 15;

    // Course Management
    private checkpoints: CheckpointData[] = [];
    private courseActive: boolean = false;
    private courseStartTime: number = 0;
    private courseEndTime: number = 0;

    // Player Tracking
    private activePlayer: Player | null = null;
    private playerProgress: PlayerProgress | null = null;
    private playerAtCheckpoint: number = 0;

    // Leaderboard
    private leaderboard: LeaderboardEntry[] = [];
    private maxLeaderboardEntries: number = 10;

    // UI Elements
    private courseUI: UI | null = null;
    private timerUI: UI | null = null;
    private leaderboardUI: UI | null = null;

    // Events
    public onCourseStarted: ((player: Player) => void) | null = null;
    public onCheckpointReached: ((checkpoint: number, time: number) => void) | null = null;
    public onCourseCompleted: ((player: Player, totalTime: number) => void) | null = null;
    public onCourseFailed: ((player: Player, reason: string) => void) | null = null;

    interface CheckpointData {
        entity: Entity;
        trigger: Trigger;
        position: Vector3;
        index: number;
        isPassed: boolean;
        passTime: number;
    }

    interface PlayerProgress {
        player: Player;
        startTime: number;
        currentTime: number;
        checkpointsPassed: number;
        isCompleted: boolean;
        completionTime: number;
        ballThrown: boolean;
    }

    interface LeaderboardEntry {
        playerName: string;
        time: number;
        date: string;
        checkpointsPassed: number;
    }

    public async start(): Promise<void> {
        try {
            console.log("[Combine_ObstacleCourse] Starting...");
            this.initializeCheckpoints();
            this.initializeThrowingNet();
            this.createUIElements();
            this.loadLeaderboard();
            console.log("[Combine_ObstacleCourse] Initialized successfully");
        } catch (error) {
            console.error(`[Combine_ObstacleCourse] Failed to initialize: ${error}`);
        }
    }

    private initializeCheckpoints(): void {
        if (!this.checkpointPrefab) {
            console.error("[Combine_ObstacleCourse] Checkpoint prefab not assigned");
            return;
        }

        this.checkpoints = [];

        for (let i = 0; i < this.numberOfCheckpoints; i++) {
            const checkpointPosition = this.calculateCheckpointPosition(i);
            const checkpointEntity = this.checkpointPrefab.clone();
            const checkpointTrigger = checkpointEntity.getComponent(Trigger);

            if (!checkpointTrigger) {
                console.error(`[Combine_ObstacleCourse] Checkpoint ${i} missing trigger`);
                continue;
            }

            checkpointEntity.setPosition(checkpointPosition);

            if (checkpointTrigger.onEnter) {
                checkpointTrigger.onEnter.add((player: Player) => {
                    this.onCheckpointEntered(player, i);
                });
            }

            const checkpointData: CheckpointData = {
                entity: checkpointEntity,
                trigger: checkpointTrigger,
                position: checkpointPosition,
                index: i,
                isPassed: false,
                passTime: 0
            };

            this.checkpoints.push(checkpointData);
        }

        console.log(`[Combine_ObstacleCourse] Initialized ${this.checkpoints.length} checkpoints`);
    }

    private calculateCheckpointPosition(index: number): Vector3 {
        const progress = (index + 1) / (this.numberOfCheckpoints + 1);
        const position = Vector3.lerp(
            this.courseStartPosition,
            this.courseEndPosition,
            progress
        );

        const lateralOffset = Math.sin(index * 0.5) * 5;
        position.x += lateralOffset;

        return position;
    }

    private initializeThrowingNet(): void {
        if (!this.throwingNet) {
            console.error("[Combine_ObstacleCourse] Throwing net not assigned");
            return;
        }

        this.throwingNet.setPosition(this.courseEndPosition);

        const netTrigger = this.throwingNet.getComponent(Trigger);
        if (netTrigger && netTrigger.onEnter) {
            netTrigger.onEnter.add((entity: Entity) => {
                this.onBallEnteredNet(entity);
            });
        }

        console.log("[Combine_ObstacleCourse] Throwing net initialized");
    }

    private createUIElements(): void {
        this.courseUI = new UI();
        this.courseUI.position = new Vector3(0, 2, -5);
        this.courseUI.size = new Vector3(4, 2);
        this.updateCourseUI();

        this.timerUI = new UI();
        this.timerUI.position = new Vector3(0, 1, -3);
        this.timerUI.size = new Vector3(2, 1);
        this.updateTimerUI();

        this.leaderboardUI = new UI();
        this.leaderboardUI.position = new Vector3(0, 0, -6);
        this.leaderboardUI.size = new Vector3(3, 4);
        this.updateLeaderboardUI();

        console.log("[Combine_ObstacleCourse] UI elements created");
    }

    public startCourse(player: Player): boolean {
        if (this.courseActive) {
            console.warn("[Combine_ObstacleCourse] Course already active");
            return false;
        }

        this.activePlayer = player;
        this.courseActive = true;
        this.courseStartTime = Date.now() / 1000;

        this.playerProgress = {
            player: player,
            startTime: this.courseStartTime,
            currentTime: this.courseStartTime,
            checkpointsPassed: 0,
            isCompleted: false,
            completionTime: 0,
            ballThrown: false
        };

        this.resetCheckpoints();
        player.setPosition(this.courseStartPosition);

        console.log(`[Combine_ObstacleCourse] Course started for ${player.name}`);

        if (this.onCourseStarted) {
            this.onCourseStarted(player);
        }

        this.updateCourseUI();
        return true;
    }

    public stopCourse(reason: string = "Course stopped"): void {
        if (!this.courseActive) return;

        this.courseActive = false;
        this.courseEndTime = Date.now() / 1000;

        if (this.activePlayer && this.onCourseFailed) {
            this.onCourseFailed(this.activePlayer, reason);
        }

        console.log(`[Combine_ObstacleCourse] Course stopped: ${reason}`);
        this.updateCourseUI();
    }

    private resetCheckpoints(): void {
        for (const checkpoint of this.checkpoints) {
            checkpoint.isPassed = false;
            checkpoint.passTime = 0;
        }
        this.playerAtCheckpoint = 0;
    }

    private onCheckpointEntered(player: Player, checkpointIndex: number): void {
        if (!this.courseActive || player !== this.activePlayer) return;

        const checkpoint = this.checkpoints[checkpointIndex];
        if (checkpoint.isPassed) return;

        const currentTime = Date.now() / 1000;
        const elapsedTime = currentTime - this.courseStartTime;

        checkpoint.isPassed = true;
        checkpoint.passTime = elapsedTime;
        this.playerAtCheckpoint++;

        if (this.playerProgress) {
            this.playerProgress.checkpointsPassed = this.playerAtCheckpoint;
        }

        console.log(`[Combine_ObstacleCourse] ${player.name} reached checkpoint ${checkpointIndex + 1} at ${elapsedTime.toFixed(2)}s`);

        this.showCheckpointFeedback(checkpoint, elapsedTime);

        if (this.onCheckpointReached) {
            this.onCheckpointReached(checkpointIndex, elapsedTime);
        }

        this.updateCourseUI();
    }

    private showCheckpointFeedback(checkpoint: CheckpointData, time: number): void {
        const indicator = new UI();
        indicator.position = Vector3.add(checkpoint.position, new Vector3(0, 3, 0));
        indicator.size = new Vector3(1, 0.5);
        indicator.text = `✓ ${time.toFixed(2)}s`;
        indicator.color = new Color(0, 1, 0);

        setTimeout(() => {
            indicator.destroy();
        }, 2000);
    }

    private onBallEnteredNet(entity: Entity): void {
        if (!this.courseActive || !this.activePlayer || !this.playerProgress) return;

        if (this.footballEntity && entity.id === this.footballEntity.id) {
            this.onBallThrownInNet();
        }
    }

    private onBallThrownInNet(): void {
        if (!this.playerProgress) return;

        const currentTime = Date.now() / 1000;
        const totalTime = currentTime - this.courseStartTime;

        this.playerProgress.isCompleted = true;
        this.playerProgress.completionTime = totalTime;
        this.playerProgress.ballThrown = true;

        this.courseActive = false;
        this.courseEndTime = currentTime;

        this.addToLeaderboard(this.activePlayer!, totalTime);

        console.log(`[Combine_ObstacleCourse] ${this.activePlayer!.name} completed course in ${totalTime.toFixed(2)}s`);

        this.showCompletionFeedback(totalTime);

        if (this.onCourseCompleted) {
            this.onCourseCompleted(this.activePlayer!, totalTime);
        }

        this.updateCourseUI();
        this.updateLeaderboardUI();
    }

    private showCompletionFeedback(time: number): void {
        if (!this.throwingNet) return;

        const feedback = new UI();
        feedback.position = Vector3.add(this.throwingNet.getPosition(), new Vector3(0, 5, 0));
        feedback.size = new Vector3(2, 1);
        feedback.text = `COURSE COMPLETE!\nTime: ${time.toFixed(2)}s`;
        feedback.color = new Color(0, 1, 0);

        setTimeout(() => {
            feedback.destroy();
        }, 5000);
    }

    private addToLeaderboard(player: Player, time: number): void {
        const entry: LeaderboardEntry = {
            playerName: player.name,
            time: time,
            date: new Date().toLocaleDateString(),
            checkpointsPassed: this.playerProgress?.checkpointsPassed || 0
        };

        this.leaderboard.push(entry);
        this.leaderboard.sort((a, b) => a.time - b.time);

        if (this.leaderboard.length > this.maxLeaderboardEntries) {
            this.leaderboard = this.leaderboard.slice(0, this.maxLeaderboardEntries);
        }

        this.saveLeaderboard();
        console.log(`[Combine_ObstacleCourse] Added leaderboard entry: ${player.name} - ${time.toFixed(2)}s`);
    }

    private saveLeaderboard(): void {
        const leaderboardData = JSON.stringify(this.leaderboard);
        console.log(`[Combine_ObstacleCourse] Saving leaderboard: ${leaderboardData}`);
    }

    private loadLeaderboard(): void {
        this.leaderboard = [];
        console.log("[Combine_ObstacleCourse] Leaderboard loaded (empty for demo)");
    }

    private updateCourseUI(): void {
        if (!this.courseUI) return;

        const status = this.courseActive ? "ACTIVE" : "INACTIVE";
        const instruction = this.courseActive ? 
            `Run through checkpoints and throw ball in net!\nCheckpoints: ${this.playerAtCheckpoint}/${this.numberOfCheckpoints}` : 
            "Press 'C' to start obstacle course";

        this.courseUI.text = `Obstacle Course: ${status}\n${instruction}`;
    }

    private updateTimerUI(): void {
        if (!this.timerUI) return;

        if (this.courseActive && this.playerProgress) {
            const currentTime = Date.now() / 1000;
            const elapsedTime = currentTime - this.courseStartTime;
            const timeRemaining = Math.max(0, this.courseTimeLimit - elapsedTime);

            this.timerUI.text = `Time: ${elapsedTime.toFixed(1)}s\n` +
                               `Limit: ${timeRemaining.toFixed(1)}s`;

            if (timeRemaining < 10) {
                this.timerUI.color = new Color(1, 0, 0);
            } else {
                this.timerUI.color = new Color(1, 1, 1);
            }
        } else {
            this.timerUI.text = "Timer: Ready";
        }
    }

    private updateLeaderboardUI(): void {
        if (!this.leaderboardUI) return;

        let leaderboardText = "=== LEADERBOARD ===\n";

        if (this.leaderboard.length === 0) {
            leaderboardText += "No times yet!";
        } else {
            for (let i = 0; i < Math.min(5, this.leaderboard.length); i++) {
                const entry = this.leaderboard[i];
                leaderboardText += `${i + 1}. ${entry.playerName}: ${entry.time.toFixed(2)}s\n`;
            }
        }

        this.leaderboardUI.text = leaderboardText;
    }

    public onPlayerInput(player: Player, input: string): void {
        if (!player.isLocal) return;

        if (input === "C") {
            if (this.courseActive) {
                this.stopCourse("Player cancelled");
            } else {
                this.startCourse(player);
            }
        }
    }

    public getCourseStatus(): any {
        return {
            isActive: this.courseActive,
            activePlayer: this.activePlayer?.name || null,
            startTime: this.courseStartTime,
            checkpointsPassed: this.playerAtCheckpoint,
            totalCheckpoints: this.numberOfCheckpoints,
            progress: this.playerProgress
        };
    }

    public getLeaderboard(): LeaderboardEntry[] {
        return [...this.leaderboard];
    }

    public update(deltaTime: number): void {
        if (!this.courseActive) return;

        this.updateTimerUI();

        if (this.playerProgress) {
            const currentTime = Date.now() / 1000;
            const elapsedTime = currentTime - this.courseStartTime;

            if (elapsedTime >= this.courseTimeLimit) {
                this.stopCourse("Time limit exceeded");
            }
        }
    }

    public onDestroy(): void {
        if (this.courseActive) {
            this.stopCourse("Course destroyed");
        }

        if (this.courseUI) this.courseUI.destroy();
        if (this.timerUI) this.timerUI.destroy();
        if (this.leaderboardUI) this.leaderboardUI.destroy();

        for (const checkpoint of this.checkpoints) {
            checkpoint.entity.destroy();
        }
        this.checkpoints = [];

        this.leaderboard = [];

        console.log("[Combine_ObstacleCourse] Destroyed");
    }
}