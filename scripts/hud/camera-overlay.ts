import { PanelHandler } from 'util/module-helpers';

@PanelHandler()
class SpeedoBarHandler {
	readonly panels = {
		cp: $.GetContextPanel<MomHudCameraOverlay>()
	};

	// constructor() {
	// }
}
