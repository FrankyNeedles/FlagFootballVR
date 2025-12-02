import { Entity, Script, Vector3, Material, Color, GameObject } from 'horizon';

/**
 * FieldSetup_Gizmo.ts
 * Purpose: A tool for creators to easily define the field geometry without hard coding coordinates.
 */
export class FieldSetup_Gizmo extends Script {
    // Public variables that creators will assign in the editor
    public FiftyYardLineMarker: Entity | null = null;
    public EndZoneA_Marker: Entity | null = null;
    public EndZoneB_Marker: Entity | null = null;
    public debug: boolean = false;
    public fieldWidthYards: number = 53.3;

    // Calculated field boundaries
    private fieldLength: number = 0;
    private fieldWidth: number = 0;
    private endZoneDepth: number = 10;
    private fieldBounds: any = null;
    private debugObjects: Entity[] = [];
    private scoreManager: any = null;

    public async start(): Promise<void> {
        try {
            console.log("[FieldSetup_Gizmo] Starting...");
            
            if (!this.validateMarkers()) {
                console.error("[FieldSetup_Gizmo] Invalid marker setup");
                return;
            }

            this.calculateFieldGeometry();
            this.initializeScoreManager();
            
            if (this.debug) {
                this.createDebugVisuals();
            }

            console.log("[FieldSetup_Gizmo] Initialized successfully");
            
        } catch (error) {
            console.error(`[FieldSetup_Gizmo] Failed to initialize: ${error}`);
        }
    }

    private validateMarkers(): boolean {
        return !!(this.FiftyYardLineMarker && this.EndZoneA_Marker && this.EndZoneB_Marker);
    }

    private calculateFieldGeometry(): void {
        if (!this.FiftyYardLineMarker || !this.EndZoneA_Marker || !this.EndZoneB_Marker) {
            throw new Error("Required markers not assigned");
        }

        const fiftyYardPos = this.FiftyYardLineMarker.getPosition();
        const endZoneAPos = this.EndZoneA_Marker.getPosition();
        const endZoneBPos = this.EndZoneB_Marker.getPosition();

        const distanceAToCenter = Vector3.distance(endZoneAPos, fiftyYardPos);
        const distanceBToCenter = Vector3.distance(endZoneBPos, fiftyYardPos);
        this.fieldLength = distanceAToCenter + distanceBToCenter;
        this.fieldWidth = this.fieldWidthYards;

        const fieldCenter = Vector3.lerp(endZoneAPos, endZoneBPos, 0.5);
        const halfLength = this.fieldLength / 2;
        const halfWidth = this.fieldWidth / 2;

        const corners = [
            new Vector3(endZoneAPos.x - halfWidth, endZoneAPos.y, endZoneAPos.z),
            new Vector3(endZoneAPos.x + halfWidth, endZoneAPos.y, endZoneAPos.z),
            new Vector3(endZoneAPos.x - halfWidth, endZoneAPos.y, endZoneAPos.z + this.endZoneDepth),
            new Vector3(endZoneAPos.x + halfWidth, endZoneAPos.y, endZoneAPos.z + this.endZoneDepth),
            new Vector3(endZoneBPos.x - halfWidth, endZoneBPos.y, endZoneBPos.z),
            new Vector3(endZoneBPos.x + halfWidth, endZoneBPos.y, endZoneBPos.z),
            new Vector3(endZoneBPos.x - halfWidth, endZoneBPos.y, endZoneBPos.z - this.endZoneDepth),
            new Vector3(endZoneBPos.x + halfWidth, endZoneBPos.y, endZoneBPos.z - this.endZoneDepth)
        ];

        this.fieldBounds = {
            center: fieldCenter,
            length: this.fieldLength,
            width: this.fieldWidth,
            endZoneA: endZoneAPos,
            endZoneB: endZoneBPos,
            corners: corners
        };

        console.log(`[FieldSetup_Gizmo] Field geometry calculated: Length=${this.fieldLength}, Width=${this.fieldWidth}`);
    }

    private initializeScoreManager(): void {
        if (!this.fieldBounds) return;

        this.scoreManager = GameObject.findObjectOfType("FlagFootball_ScoreManager");
        
        if (this.scoreManager && this.scoreManager.setFieldBoundaries) {
            this.scoreManager.setFieldBoundaries(this.fieldBounds);
            console.log("[FieldSetup_Gizmo] Field boundaries passed to Score Manager");
        }
    }

    private createDebugVisuals(): void {
        if (!this.fieldBounds) return;
        this.clearDebugVisuals();
        this.createCornerPylons();
    }

    private createCornerPylons(): void {
        if (!this.fieldBounds) return;

        for (let i = 0; i < this.fieldBounds.corners.length; i++) {
            const pylon = Entity.create();
            pylon.setPosition(this.fieldBounds.corners[i]);
            
            const cylinder = GameObject.createPrimitive("Cylinder");
            cylinder.transform.scale = new Vector3(0.1, 2, 0.1);
            
            const pylonMaterial = new Material();
            pylonMaterial.setAlbedoColor(new Color(1, 0.5, 0));
            cylinder.setMaterial(pylonMaterial);
            
            pylon.addChild(cylinder);
            this.debugObjects.push(pylon);
        }

        console.log(`[FieldSetup_Gizmo] Created ${this.debugObjects.length} debug pylons`);
    }

    private clearDebugVisuals(): void {
        for (const obj of this.debugObjects) {
            obj.destroy();
        }
        this.debugObjects = [];
    }

    public getFieldBounds(): any {
        return this.fieldBounds;
    }

    public recalculateField(): void {
        this.calculateFieldGeometry();
        this.initializeScoreManager();
        if (this.debug) {
            this.createDebugVisuals();
        }
    }

    public onDestroy(): void {
        this.clearDebugVisuals();
        console.log("[FieldSetup_Gizmo] Destroyed");
    }
}