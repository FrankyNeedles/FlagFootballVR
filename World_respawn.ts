import { Component, SpawnPointGizmo } from "horizon/core";


class World_respawn extends Component<typeof World_respawn> {
  static propsDefinition = {};

  start() {
    this.async.setInterval(() => {this.loop()}, 1000);

  }

  loop(){
    const allplayers = this.world.getPlayers();

    allplayers.forEach((player) => {
      const pos = player.position.get();
      if (pos.y < -315) {
        this.entity.as(SpawnPointGizmo).teleportPlayer(player);
      }
    })
  }
}
Component.register(World_respawn);