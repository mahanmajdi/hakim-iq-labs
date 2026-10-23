/**
 * MediaPipe Face Landmarker indices (478-point topology: 468 face mesh + 10 iris).
 * "Right"/"left" are the subject's own sides: the subject's right eye appears
 * on the image's left in a normal (non-mirrored) photo.
 */

export const LM = {
  foreheadTop: 10,
  glabella: 9,
  nasion: 168,
  noseTip: 4,
  subnasale: 2,
  upperLipTop: 0,
  upperLipBottom: 13,
  lowerLipTop: 14,
  lowerLipBottom: 17,
  menton: 152,

  rEyeOuter: 33,
  rEyeInner: 133, // inner corner of the lid margin (used for canthal tilt)
  lEyeInner: 362,
  lEyeOuter: 263,
  // Inner canthi on the outer eye contour. On real faces these reproduce the
  // anthropometric norm (intercanthal width ≈ eye width ≈ ⅕ face width), so
  // they are used for eye spacing.
  rCanthus: 243,
  lCanthus: 463,
  rEyeTop: 159,
  rEyeBottom: 145,
  lEyeTop: 386,
  lEyeBottom: 374,
  rIris: 468,
  lIris: 473,

  rBrowInner: 107,
  lBrowInner: 336,

  rMouth: 61,
  lMouth: 291,

  rCheek: 234, // face contour at cheekbone level
  lCheek: 454,
  rGonion: 172, // jaw corner
  lGonion: 397,
  rTemple: 54,
  lTemple: 284,
};

/** Points along the facial midline (top → chin). */
export const MIDLINE = [10, 151, 9, 8, 168, 6, 197, 195, 5, 4, 1, 19, 94, 2, 164, 0, 11, 12, 13, 14, 15, 16, 17, 18, 200, 199, 175, 152];

/** Bilateral mirror pairs [subject-right, subject-left] used for symmetry. */
export const MIRROR_PAIRS = [
  [33, 263], [133, 362], [159, 386], [145, 374], [160, 387], [144, 373], // eyes
  [70, 300], [105, 334], [107, 336], [46, 276], [52, 282], // brows
  [129, 358], [98, 327], [64, 294], [48, 278], // nose
  [61, 291], [40, 270], [91, 321], [37, 267], [84, 314], // lips
  [50, 280], [205, 425], [116, 345], [123, 352], // cheeks
  [109, 338], [67, 297], [103, 332], [54, 284], [21, 251], [162, 389], [127, 356], [234, 454], // upper contour
  [93, 323], [132, 361], [58, 288], [172, 397], [136, 365], [150, 379], [149, 378], [176, 400], [148, 377], // jaw contour
];

/** Pairs used to estimate the face's left–right axis (stable, well-detected points). */
export const AXIS_PAIRS = [[33, 263], [133, 362], [70, 300], [61, 291], [234, 454], [127, 356], [58, 288]];

/**
 * Nose-wing (alar) pairs; their mean width is used as nose width. Measured on
 * 54 real faces this gives ≈ 0.25 × face width, matching anthropometric norms.
 */
export const ALAR_PAIRS = [[98, 327], [48, 278]];

/** Contours for drawing the overlay. */
export const CONTOURS = {
  faceOval: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10],
  rightEye: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33],
  leftEye: [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466, 263],
  rightBrow: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 70],
  leftBrow: [300, 293, 334, 296, 336, 285, 295, 282, 283, 276, 300],
  lipsOuter: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185, 61],
  lipsInner: [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78],
  noseBridge: [168, 6, 197, 195, 5, 4, 1, 19, 94, 2],
};
