import { CustomizerPropertyType, registerHUDCustomizerComponent } from 'common/hud-customizer';
import { SpeedometerColorType, SpeedometerType } from 'common/speedometer';
import { GamemodeCategory, GamemodeCategoryToGamemode } from 'common/web/enums/gamemode.enum';
import { GamemodeCategories } from 'common/web/maps/gamemodes.map';
import { RgbaTuple, rgbaStringToTuple, tupleToRgbaString } from 'util/colors';
import { OnPanelLoad, PanelHandler } from 'util/module-helpers';

// copied from `hud/speedometer.ts`, should probably be imported from a util file instead
interface Range {
	min: number;
	max: number;
	color: rgbaColor;
}
type RuntimeSettings = SpeedometerSettingsAPI.Settings & { range_colors?: Range[] };

// settings are temporarily hardcoded, should be replaced with an api call later
const markers = {
	horizontal: [855, 895],
	vertical: [450, 1100]
};
const maxSpeed = {
	horizontal: 1750,
	vertical: 2200
};

const settings: RuntimeSettings = {
	enabled_axes: [false, false, false],
	custom_label: 'speedoBar',
	type: SpeedometerType.OVERALL_VELOCITY,
	color_type: SpeedometerColorType.RANGE,
	range_colors: []
};
const horizontalSettings: RuntimeSettings = {
	enabled_axes: [true, true, false],
	custom_label: settings.custom_label,
	type: settings.type,
	color_type: settings.color_type,
	range_colors: [
		{ min: 0, max: 700, color: 'rgba(147, 147, 147, 1)' },
		{ min: 700, max: 855, color: 'rgba(35, 125, 235, 1)' },
		{ min: 855, max: 895, color: 'rgba(0, 255, 85, 1)' },
		{ min: 895, max: 1200, color: 'rgba(35, 125, 235, 1)' },
		{ min: 1200, max: 3500, color: 'rgba(147, 147, 147, 1)' }
	]
};
const verticalSettings: RuntimeSettings = {
	enabled_axes: [false, false, true],
	custom_label: settings.custom_label,
	type: settings.type,
	color_type: settings.color_type,
	range_colors: [
		{ min: 0, max: 900, color: 'rgba(147, 147, 147, 1)' },
		{ min: 900, max: 1100, color: 'rgba(35, 125, 235, 1)' },
		{ min: 1100, max: 1200, color: 'rgba(0, 255, 85, 1)' },
		{ min: 1200, max: 1400, color: 'rgba(35, 125, 235, 1)' },
		{ min: 1400, max: 3500, color: 'rgba(147, 147, 147, 1)' }
	]
};

@PanelHandler()
class SpeedoBarHandler implements OnPanelLoad {
	readonly panels = {
		cp: $.GetContextPanel<MomHudSpeedoBars>(),
		horizontalMeter: $<ProgressBar>('#HorizontalSpeedoBarMeter'),
		verticalMeter: $<ProgressBar>('#VerticalSpeedoBarMeter')
	};

	constructor() {
		$.RegisterForUnhandledEvent('OnSpeedometerUpdate', () => this.onSpeedoBarsUpdate());
		registerHUDCustomizerComponent($.GetContextPanel(), {
			name: 'Speedo Bars', // #LOCALIZE_ME
			resizeX: true,
			resizeY: true,
			gamemode: GamemodeCategoryToGamemode.get(GamemodeCategory.SJ),
			dynamicStyles: {
				borderStyles: {
					name: $.Localize('#Customizer_Sticky_Charge_BorderStyles'),
					type: CustomizerPropertyType.NONE,
					expandable: true,
					children: [{ styleID: 'borderWidth' }, { styleID: 'borderColor' }, { styleID: 'borderRadius' }]
				},
				borderWidth: {
					name: $.Localize('#Customizer_BorderWidth'),
					type: CustomizerPropertyType.NUMBER_ENTRY,
					targetPanel: '.speedobar__meter',
					styleProperty: 'borderWidth',
					valueFn: (value) => `${value}px`
				},
				borderColor: {
					name: $.Localize('#Customizer_BorderColor'),
					type: CustomizerPropertyType.COLOR_PICKER,
					targetPanel: '.speedobar__meter',
					styleProperty: 'borderColor'
				},
				borderRadius: {
					name: $.Localize('#Customizer_BorderRadius'),
					type: CustomizerPropertyType.NONE,
					expandable: true,
					children: [{ styleID: 'backgroundRadius' }, { styleID: 'fillRadius' }]
				},
				backgroundRadius: {
					name: $.Localize('#Customizer_Background'),
					type: CustomizerPropertyType.NUMBER_ENTRY,
					targetPanel: '.speedobar__meter',
					styleProperty: 'borderRadius',
					valueFn: (value) => `${value}px`,
					settingProps: { min: 0, max: 10 }
				},
				fillRadius: {
					name: $.Localize('#Customizer_Fill'),
					type: CustomizerPropertyType.NUMBER_ENTRY,
					targetPanel: '.ProgressBarLeft',
					styleProperty: 'borderRadius',
					valueFn: (value) => `${value}px`,
					settingProps: { min: 0, max: 10 }
				},
				colors: {
					name: $.Localize('#Customizer_Colors'),
					type: CustomizerPropertyType.NONE,
					expandable: true,
					children: [
						{ styleID: 'backgroundGradient' },
						{ styleID: 'fillGradient' },
						{ styleID: 'markerColor' }
					]
				},
				backgroundGradient: {
					name: $.Localize('#Customizer_Background'),
					type: CustomizerPropertyType.GRADIENT_PICKER,
					targetPanel: '.ProgressBarRight',
					styleProperty: 'backgroundColor',
					valueFn: (value) => {
						return `gradient(linear, 0% 0%, 100% 0%, from (${value[0]}), to(${value[1]}))` as color;
					}
				},
				fillGradient: {
					name: $.Localize('#Customizer_Fill'),
					type: CustomizerPropertyType.GRADIENT_PICKER,
					targetPanel: '.ProgressBarLeft',
					styleProperty: 'backgroundColor',
					valueFn: (value) => {
						return `gradient(linear, 0% 0%, 100% 0%, from (${value[0]}), to(${value[1]}))` as color;
					}
				},
				markerColor: {
					name: 'Marker Color', // #LOCALIZE_ME
					type: CustomizerPropertyType.COLOR_PICKER,
					targetPanel: '.speedobar__marker',
					styleProperty: 'backgroundColor'
				}
			},
			postInit: () => {
				this.createMarkers();
			}
		});
	}

	onPanelLoad() {
		this.createMarkers();
	}

	createMarkers() {
		// create markers
		for (const speed of markers.horizontal) {
			let speedPercentage = (speed / maxSpeed.horizontal) * 100;
			const newPanel = $.CreatePanel('Panel', this.panels.cp, '', {
				class: `speedobar__marker speedobar__marker__horizontal`
			});
			newPanel.style.position = `${speedPercentage}% 0 0`;
		}
		for (const speed of markers.vertical) {
			let speedPercentage = (speed / maxSpeed.vertical) * 100;
			const newPanel = $.CreatePanel('Panel', this.panels.cp, '', {
				class: `speedobar__marker speedobar__marker__vertical`
			});
			newPanel.style.position = `0 ${-speedPercentage}% 0`;
		}
	}

	onSpeedoBarsUpdate() {
		// set vertical meter width to container height
		$('#VerticalSpeedoBarMeter').style.width = `${this.panels.cp.actuallayoutheight}px`;
		const velocity = MomentumPlayerAPI.GetVelocity();
		this.updateMeter(this.panels.horizontalMeter, velocity, horizontalSettings, maxSpeed.horizontal);
		this.updateMeter(this.panels.verticalMeter, velocity, verticalSettings, maxSpeed.vertical);
	}

	updateMeter(panel: ProgressBar, velocity: vec3, settings: RuntimeSettings, maxSpeed: number) {
		const speed = this.getSpeedFromVelocity(velocity, settings);
		const speedPercentage = speed / maxSpeed;
		panel.value = speedPercentage;

		// this.colorMeter(panel, speed, settings);
	}

	// colorMeter(panel: ProgressBar, speed: number, settings: RuntimeSettings) {
	// 	let progressBarLeft = panel.FindChildrenWithClassTraverse('ProgressBarLeft');

	// 	if (settings.color_type === SpeedometerColorType.RANGE && settings.range_colors) {
	// 		for (const range of settings.range_colors) {
	// 			if (speed >= range.min && speed <= range.max) {
	// 				// set highlight color to a lighter shade of range color
	// 				let highlightColorTuple: RgbaTuple = rgbaStringToTuple(range.color);
	// 				for (let i = 0; i < highlightColorTuple.length - 1; i++) {
	// 					highlightColorTuple[i] += 75;
	// 					if (highlightColorTuple[i] > 255) {
	// 						highlightColorTuple[i] = 255;
	// 					}
	// 				}
	// 				let highlightColor: rgbaColor = tupleToRgbaString(highlightColorTuple);

	// 				progressBarLeft[0].style.backgroundColor =
	// 					'gradient(linear, 0% 0%, 100% 0%, from(' +
	// 					range.color +
	// 					'), to(' +
	// 					highlightColor +
	// 					')) !default';
	// 			}
	// 		}
	// 	}
	// }

	// copied from `hud/speedometer.ts`, should probably be imported from a util file instead
	getSpeedFromVelocity({ x, y, z }: vec3, settings: SpeedometerSettingsAPI.Settings): float {
		const [xEnabled, yEnabled, zEnabled] = settings.enabled_axes;
		// @ts-expect-error - fastest way to do this, using type coercion (false = 0, true = 1)
		const numAxes = xEnabled + yEnabled + zEnabled;

		if (numAxes > 1) {
			let squaredParts = 0;
			if (xEnabled) squaredParts += x ** 2;
			if (yEnabled) squaredParts += y ** 2;
			if (zEnabled) squaredParts += z ** 2;
			return Math.sqrt(squaredParts);
		} else if (numAxes === 1) {
			if (xEnabled) return Math.abs(x);
			if (yEnabled) return Math.abs(y);
			if (zEnabled) return Math.abs(z);
		} else {
			$.Warning('Speedometer with no enabled axes found');
			return 0;
		}
	}
	// appendRangeColorProfileInfo(
	// 	speedoData: RuntimeSettings,
	// 	colorProfData: SpeedometerSettingsAPI.ColorProfile[]
	// ): Range {
	// 	if (speedoData.color_type !== SpeedometerColorType.RANGE) return;

	// 	// const colorProf = speedoData.range_color_profile;
	// 	// if (!colorProf) return;

	// 	// const foundProfile = colorProfData.find((profile) => colorProf === profile.profile_name);
	// 	// if (!foundProfile) return;

	// 	// const ranges = foundProfile.profile_ranges;
	// 	// if (!ranges) return;

	// 	// speedoData.range_colors = ranges.map((range) => ({
	// 	// 	min: range.min,
	// 	// 	max: range.max,
	// 	// 	color: tupleToRgbaString(range.color)
	// 	// }));

	// 	speedoData.range_colors = [{ min: 850, max: 900, color: tupleToRgbaString([255, 0, 255, 255]) }];
	// }
}
