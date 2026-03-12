import { zenith } from "./theme";

export const nivoTheme = {
  text: {
    fill: zenith.neutral700,
    fontSize: 12,
    fontFamily: zenith.fontFamily,
  },
  axis: {
    ticks: {
      text: {
        fill: zenith.neutral700,
        fontSize: 12,
        fontFamily: zenith.fontFamily,
      },
    },
  },
  grid: {
    line: {
      stroke: zenith.neutral100,
      strokeDasharray: "3 3",
    },
  },
  crosshair: {
    line: {
      stroke: zenith.neutral500,
    },
  },
};
