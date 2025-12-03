import { Component, PropTypes, Player, TriggerGizmo, TextGizmo, Entity } from 'horizon/core';

/**
 * GameJoinTrigger_Logic - Simplified Version
 * Purpose: Basic player team joining
 */
class GameJoinTrigger_Logic extends Component {
  static propsDefinition = {
    role: { type: PropTypes.String, default: 'TeamA' }, 
    flagManager: { type: PropTypes.Entity },
    feedbackText: { type: PropTypes.Entity },
    debug: { type: PropTypes.Boolean, default: true }
  };

  start() {
    try {
      const trigger = this.entity.as(TriggerGizmo);
      
      if (trigger) {
        const t = trigger as any;
        
        if (t.onEnter) {
          t.onEnter.connect((player: Player) => this.handlePlayerJoin(player));
        } else if (t.onPlayerEnter) {
          t.onPlayerEnter.connect((player: Player) => this.handlePlayerJoin(player));
        } else {
          console.error("TriggerGizmo: Could not find enter event!");
        }
      } else {
        console.error("GameJoinTrigger: Entity is not a TriggerGizmo!");
      }
    } catch (error) {
      console.error("GameJoinTrigger: Error in start:", error);
    }
  }

  private handlePlayerJoin(player: any) {
    try {
      if (!player || !player.name) {
        console.log("Object entered trigger, but it's not a player.");
        return;
      }

      const role = this.props.role;
      console.log(`Player ${player.name} joined ${role}`);

      if (this.props.feedbackText) {
        const t = this.props.feedbackText.as(TextGizmo);
        if (t) {
          t.text.set(`Welcome ${player.name} to ${role}!`);
        }
      }

      if (this.props.flagManager) {
        this.connectToFlagManager(player, role);
      }
    } catch (error) {
      console.error("GameJoinTrigger: Error handling player join:", error);
    }
  }

  private connectToFlagManager(player: Player, role: string) {
    try {
      const flagManager = this.props.flagManager as any;
      
      if (flagManager && flagManager.attachFlagsToPlayer) {
        if (role === 'Spectator') {
          flagManager.removeFlagsFromPlayer(player);
        } else {
          flagManager.attachFlagsToPlayer(player, role);
        }
      } else {
        console.log("Flag manager found but missing methods");
      }
    } catch (error) {
      console.error("GameJoinTrigger: Error connecting to flag manager:", error);
    }
  }
}

Component.register(GameJoinTrigger_Logic);