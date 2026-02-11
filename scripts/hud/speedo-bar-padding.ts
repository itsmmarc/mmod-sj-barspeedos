import { GamemodeCategory } from 'common/web/enums/gamemode.enum';
import { GamemodeCategories } from 'common/web/maps/gamemodes.map';
import { PanelHandler } from 'util/module-helpers';
import { RegisterHUDPanelForGamemode } from 'util/register-for-gamemodes';

@PanelHandler()
class SpeedoBarHandler {
	readonly panels = {
		cp: $.GetContextPanel<MomHudSpeedoBarPadding>()
	};

	constructor() {
		RegisterHUDPanelForGamemode({
			gamemodes: GamemodeCategories.get(GamemodeCategory.SJ)
		});
	}
}
