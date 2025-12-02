# Flag Football Scripts for Horizon Worlds

This folder contains corrected TypeScript files for your 7v7 Flag Football simulator that should compile without errors in your Horizon Worlds project.

## Files Included

1. **FieldSetup_Gizmo.ts** - Field geometry setup tool
2. **FlagFootball_ScoreManager.ts** - Game state and scoring management
3. **GameJoinTrigger_Logic.ts** - Player role selection and team management
4. **FlagFootball_Gizmo.ts** - Flag attachment and management system
5. **TargetPractice_Manager.ts** - Quarterback practice mode
6. **Combine_ObstacleCourse.ts** - Athletic skills obstacle course
7. **Spectator_Hud.ts** - Spectator information display

## Key Fixes Made

### API Compatibility
- Removed `@Property` decorators (not standard TypeScript)
- Simplified event handling to use basic Horizon Worlds API
- Fixed import statements and type declarations
- Removed complex generics that might cause compilation errors

### Error Handling
- Added proper null checks throughout
- Simplified async/await patterns
- Removed complex interface definitions that might not be supported
- Fixed method signatures to match expected Horizon Worlds API

### Performance Optimizations
- Simplified update loops
- Removed unnecessary complex calculations
- Streamlined object pooling logic
- Fixed memory management

## Usage Instructions

1. Copy all `.ts` files from this folder into your Horizon Worlds project
2. Attach the scripts to appropriate entities in your scene
3. Configure the public properties in the editor
4. The scripts should now compile without errors

## Script Dependencies

Each script is designed to work independently but integrates with others:

- **FieldSetup_Gizmo** → **FlagFootball_ScoreManager**
- **GameJoinTrigger_Logic** → **FlagFootball_ScoreManager**, **FlagFootball_Gizmo**
- **Spectator_Hud** → **FlagFootball_ScoreManager**, **GameJoinTrigger_Logic**

## Features

### Core Game Systems
- 7v7 team support with automatic capacity management
- Manual referee spotting system
- Comprehensive scoring and game state management
- Role-based player assignment (Team A/B, Referee, Spectator)

### Practice Modes
- Target practice with distance-based scoring
- Combine obstacle course with checkpoints and leaderboard
- Idle timeout system for realistic simulation

### Spectator System
- Flight mode with toggle controls
- Real-time game information display
- Multiple camera modes (free, follow, overview)
- Team color identification

## Configuration

Most settings can be configured via public properties in the Horizon Worlds editor:

- Team sizes and colors
- Field dimensions
- Scoring values
- Time limits
- UI positions

## Troubleshooting

If you encounter any issues:

1. Check that all required entity references are assigned in the editor
2. Ensure the Horizon Worlds TypeScript API is up to date
3. Verify that your project supports the used API features
4. Check console logs for specific error messages

## Support

These scripts are designed to be modular and easily extensible. Each script includes comprehensive logging for debugging purposes.