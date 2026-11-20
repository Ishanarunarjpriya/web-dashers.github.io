(() => {
  const GD_SHADER_SOURCE = `
#ifdef GL_ES
precision mediump float;

#ifdef GL_FRAGMENT_PRECISION_HIGH
#define PRECISION highp
#else
#define PRECISION mediump
#endif
#else
#define PRECISION
#endif

varying vec2 outTexCoord;
uniform sampler2D uMainSampler;

// ---------------------
// COMMON
// ---------------------
uniform vec2 _textureScale;
uniform vec2 _textureScaleInv;
uniform float _screenAspect;
uniform float _screenAspectInv;

// ---------------------
// SHOCKWAVE
// ---------------------
uniform float _shockWaveTime;
uniform float _shockWaveTime1;
uniform float _shockWaveTime2;
uniform float _shockWaveTime3;
uniform float _shockWaveTime4;
uniform float _shockWaveStrength;
uniform float _shockWaveWaves;
uniform vec2 _shockWaveCenter;
uniform bool _shockWaveInvert;
uniform float _shockWaveMinSize;
uniform float _shockWaveMaxSize;
uniform float _shockWaveMaxDistVal;

// ---------------------
// SHOCKLINE
// ---------------------
uniform float _shockLineTime;
uniform float _shockLineTime1;
uniform float _shockLineTime2;
uniform float _shockLineTime3;
uniform float _shockLineTime4;
uniform bool _shockLineAxis;
uniform bool _shockLineDirection;
uniform bool _shockLineDual;
uniform float _shockLineWaves;
uniform vec2 _shockLineStrength;
uniform float _shockLineCenter;
uniform float _shockLineMaxDistVal;

// ---------------------
// GLITCH
// ---------------------
uniform float _glitchBot;
uniform float _glitchTop;
uniform float _glitchXOffset;
uniform vec2 _glitchColOffset;
uniform float _glitchRnd;

// ---------------------
// CHROMATIC
// ---------------------
uniform float _chromaticXOff;
uniform float _chromaticYOff;

// ---------------------
// LENSCIRCLE
// ---------------------
uniform PRECISION vec2 _lensCircleOrigin;
uniform float _lensCircleStart;
uniform float _lensCircleEnd;
uniform float _lensCircleStrength;
uniform vec3 _lensCircleTint;
uniform bool _lensCircleAdditive;

// ---------------------
// BULGE
// ---------------------
uniform vec2 _bulgeOrigin;
uniform float _bulgeValue;
uniform float _bulgeValue2;
uniform float _bulgeRadius;

// ---------------------
// PINCH
// ---------------------
uniform vec2 _pinchCenterPos;
uniform vec2 _pinchValue;
uniform vec2 _pinchCalc1;
uniform float _pinchRadius;

// ---------------------
// BLUR COMMON
// ---------------------
uniform bool _blurUseRef;
uniform vec3 _blurRefColor;
uniform float _blurIntensity;
uniform float _blurFade;
uniform bool _blurOnlyEmpty;

// ---------------------
// RADIALBLUR
// ---------------------
uniform vec2 _radialBlurCenter;
uniform float _radialBlurValue;

#define radialBlurSamples 10
#define radialBlurSamplesInv 0.1

// ---------------------
// MOTIONBLUR
// ---------------------
uniform vec2 _motionBlurValue;
uniform float _motionBlurMult;
uniform bool _motionBlurDual;

#define mbSamples 9.0
#define mbSamplesLoop 9.0
const float mbSamplesInv = 1.0/mbSamples;

#define mbSamplesDual 9.0
#define mbSamplesLoopDual 5.0
const float mbSamplesDualInv = 1.0/mbSamplesDual;

// ---------------------
// CHROMATICGLITCH
// ---------------------
uniform float _cGTime;
uniform float _cGRGBOffset; // 1.0
uniform float _cGYOffset;
uniform float _cGStrength; // 0.02
uniform float _cGHeight;
uniform float _cGLineStrength;
uniform float _cGLineThick;

// ---------------------
// SEPIA
// ---------------------
uniform float _sepiaValue;
const mat4 sepiaMat = mat4(0.393, 0.769, 0.189, 0.0, 0.349, 0.686, 0.168, 0.0, 0.272, 0.534, 0.131, 0.0, 0,0,0,0);

// ---------------------
// INVERT
// ---------------------
uniform vec4 _invertColorValue;

// ---------------------
// GRAYSCALE
// ---------------------
uniform float _grayscaleValue;
uniform vec3 _grayscaleTint;
uniform bool _grayscaleUseLum;

// ---------------------
// HUESHIFT
// ---------------------
uniform float _hueShiftCosA;
uniform float _hueShiftSinA;

// ---------------------
// COLORCHANGE
// ---------------------
uniform vec3 _colorChangeC;
uniform vec3 _colorChangeB;

const vec3 _hueShiftK = vec3(0.57735, 0.57735, 0.57735);

// ---------------------
// SPLITSCREEN
// ---------------------
uniform float _rowmod;
uniform float _colmod;

uniform float _rowmodCalc;
uniform float _colmodCalc;

uniform float _splitXStart;
uniform float _splitXRange;
uniform float _splitXRangeMult;
uniform float _splitYStart;
uniform float _splitYRange;
uniform float _splitYRangeMult;

uniform vec2 _pixelSize;

// ---------------------
// FUNCTIONS
// ---------------------

// return 1 if v inside 1d range
float insideRange(float v, float bottom, float top) {
   return step(bottom, v) - step(top, v);
}

float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 437.5854);
}
    
float noise(vec2 n) {
    const vec2 d = vec2(0.0, 1.0);
    vec2 b = floor(n), f = smoothstep(vec2(0.0), vec2(1.0), fract(n));
    return mix(mix(rand(b), rand(b + d.yx), f.x), mix(rand(b + d.xy), rand(b + d.yy), f.x), f.y);
}

// ---------------------
// MAIN
// ---------------------
void main() 
{ 
	vec2 targetVec = outTexCoord;
	if (_pixelSize.x > 0.0) targetVec.x = (floor(targetVec.x / _pixelSize.x) + 0.5) * _pixelSize.x;
	if (_pixelSize.y > 0.0) targetVec.y = (floor(targetVec.y / _pixelSize.y) + 0.5) * _pixelSize.y;

	// ---------------------
	// SHOCKWAVE
	// ---------------------
	if (_shockWaveTime > 0.0) {
        PRECISION vec2 p = (targetVec*_textureScaleInv - _shockWaveCenter) * vec2(1.0, _screenAspect);

		float dis = max(length(p), 0.0001);

		float k = _shockWaveMaxDistVal != 0.0 ? clamp(1.0 - dis * _shockWaveMaxDistVal, 0.0, 1.0) : 1.0;
		if (_shockWaveInvert) dis = _shockWaveMaxSize - max(dis, _shockWaveMinSize);

		k *= clamp(smoothstep(_shockWaveTime1, _shockWaveTime2, dis) - smoothstep(_shockWaveTime3, _shockWaveTime4, dis), 0.0, 1.0);

		// Ripples equation multiplied with ring circles so that it will be shockwave
		targetVec += k * ((p/dis) * sin(dis * _shockWaveWaves - _shockWaveTime) * _shockWaveStrength) * vec2(1.0, _screenAspectInv);
	}

	// ---------------------
	// SHOCKLINE
	// ---------------------
	if (_shockLineTime != 0.0) {
		float dis = _shockLineAxis ? ((targetVec.y * _textureScaleInv.y - _shockLineCenter) * _screenAspect) : (targetVec.x * _textureScaleInv.x - _shockLineCenter);
        
		float k = _shockLineMaxDistVal == 0.0 ? 1.0 : (clamp(1.0 + (dis < 0.0 ? 1.0 : -1.0) * dis * _shockLineMaxDistVal, 0.0, 1.0));

		if (_shockLineDual) dis = abs(dis);
		if (_shockLineDirection) dis = 1.0-dis;

        k *= clamp(smoothstep(_shockLineTime1, _shockLineTime2, dis) - smoothstep(_shockLineTime3, _shockLineTime4, dis), 0.0, 1.0);
		targetVec += k * sin(dis*_shockLineWaves-_shockLineTime) * _shockLineStrength * vec2(1.0, _screenAspectInv);
	}


	// ---------------------
	// BULGE
	// ---------------------
	if (_bulgeValue > 0.0) {
         PRECISION vec2 d = (targetVec*_textureScaleInv - _bulgeOrigin) * vec2(1.0, _screenAspect);

		float di = length(d);

		if (di < _bulgeRadius) {
			float fadeValue = pow(di / _bulgeRadius, 3.0);
			vec2 bulgedVec = (_bulgeOrigin * vec2(1.0, _screenAspect) + normalize(d) * tan(sqrt(dot(d, d)) * _bulgeValue) * _bulgeValue2) * _textureScale * vec2(1.0, _screenAspectInv);
			targetVec = targetVec * fadeValue + bulgedVec * (1.0 - fadeValue);
		}
	}

	// ---------------------
	// PINCH
	// ---------------------
	// Original function
	if (_pinchValue.x != 0.0 || _pinchValue.y != 0.0) {
         PRECISION vec2 d = (targetVec*_textureScaleInv - _pinchCenterPos) * vec2(1.0, _screenAspect);

		float di = length(d);
		if (di < _pinchRadius) {
			float fadeValue = pow(di / _pinchRadius, 2.0);
			vec2 pinchedVec = (_pinchCenterPos * vec2(1.0, _screenAspect) + normalize(d) * atan(sqrt(dot(d, d)) * -_pinchValue * 20.0) * _pinchCalc1) * _textureScale * vec2(1.0, _screenAspectInv);
			targetVec = targetVec * fadeValue + pinchedVec * (1.0 - fadeValue);
		}
	}

	// ---------------------
	// GLITCH
	// ---------------------
	if (_glitchTop > 0.0) {
		// Random offset slices horizontally
		targetVec.x += _glitchXOffset * insideRange(targetVec.y, _glitchBot, _glitchTop);
	}

	// ---------------------
	// SPLITSCREEN
	// ---------------------
	if (_colmod != 1.0 || _rowmod != 1.0) {
		float normalizedX = (targetVec.x - _splitXStart) * _splitXRangeMult;
		normalizedX = (normalizedX < 0.5*_textureScale.x) ? normalizedX * _colmod : (normalizedX * _colmod) + _colmodCalc;
		targetVec.x = _splitXStart + fract(normalizedX) * _splitXRange;

		float normalizedY = (targetVec.y - _splitYStart) * _splitYRangeMult;
		normalizedY = (normalizedY < 0.5*_textureScale.y) ? normalizedY * _rowmod : (normalizedY * _rowmod) + _rowmodCalc;
		targetVec.y = _splitYStart + fract(normalizedY) * _splitYRange;
	}

	// --------------------- --------------------- ---------------------
	// --------------------- --------------------- ---------------------

	// ---------------------
	// APPLY THE COLOR
	// ---------------------
	gl_FragColor = texture2D(uMainSampler, targetVec);

	// --------------------- --------------------- ---------------------
	// --------------------- --------------------- ---------------------

	// ---------------------
	// CHROMATICGLITCH
	// ---------------------
	if (_cGRGBOffset != 0.0) {
		float cVal = (outTexCoord.y+_cGYOffset)*50.0*_cGHeight;
		targetVec.x += (noise(vec2(_cGTime,cVal))-noise(vec2(0,cVal)))*_cGStrength;
		vec4 r = texture2D(uMainSampler, vec2(targetVec.x - _cGRGBOffset, targetVec.y));
		vec4 g = texture2D(uMainSampler, vec2(targetVec.x, targetVec.y));
		vec4 b = texture2D(uMainSampler, vec2(targetVec.x + _cGRGBOffset, targetVec.y));

		vec3 color = vec3(r.r, g.g, b.b);

		if (_cGLineThick > 0.0) {
			color -= smoothstep(_cGLineThick - 0.01, _cGLineThick + 0.01, sin((outTexCoord.y+_cGYOffset)*300.0*_cGHeight))*_cGLineStrength;
		}
	
		gl_FragColor = vec4(color, (r.a+g.a+b.a)*0.3333);
	}

	// ---------------------
	// GLITCH
	// ---------------------
	if (_glitchTop > 0.0) {
		// Offset one channel
		if (_glitchRnd < 0.33) {
			vec4 col2 = texture2D(uMainSampler, targetVec + _glitchColOffset);
			gl_FragColor.r = col2.r;
			gl_FragColor.a = max(gl_FragColor.a, col2.a);
		}
		else if (_glitchRnd < 0.66) {
			vec4 col2 = texture2D(uMainSampler, targetVec + _glitchColOffset);
			gl_FragColor.g = col2.g;
			gl_FragColor.a = max(gl_FragColor.a, col2.a);
		}
		else {
			vec4 col2 = texture2D(uMainSampler, targetVec + _glitchColOffset);
			gl_FragColor.b = col2.b;
			gl_FragColor.a = max(gl_FragColor.a, col2.a);
		}
	}

	// ---------------------
	// CHROMATIC
	// ---------------------
	if (_chromaticXOff != 0.0 || _chromaticYOff != 0.0) {
		vec4 r = texture2D(uMainSampler, targetVec + vec2(_chromaticXOff, _chromaticYOff));
		vec4 b = texture2D(uMainSampler, targetVec + vec2(-_chromaticXOff, -_chromaticYOff));
		gl_FragColor = vec4(r.r, gl_FragColor.g, b.b, max(r.a, max(gl_FragColor.a,b.a)));
	}

	// ---------------------
	// RADIALBLUR
	// ---------------------
	if (_radialBlurValue != 0.0) {
		vec4 result = gl_FragColor;
		if (!_blurOnlyEmpty || result.a < 0.1) {
			vec2 uv = targetVec;
			vec2 blurVector = (_radialBlurCenter - uv) * _radialBlurValue;
			float modVal = 1.0 + 4.5*_blurFade;
			result *= modVal;
			for (int i = 1; i < radialBlurSamples; i++) {
				modVal -= _blurFade;
				uv.xy += blurVector.xy;
    			result += texture2D(uMainSampler, uv) * modVal;
			}

			result *= radialBlurSamplesInv;
		
			// Output to screen
			if (_blurUseRef) {
				gl_FragColor = vec4((result.rgb + _blurRefColor * (1.0-result.a)), result.a * _blurIntensity);
			}
			else gl_FragColor = result;
		}
	}
	// ---------------------
	// MOTIONBLUR
	// ---------------------
	else if (_motionBlurValue.x != 0.0 || _motionBlurValue.y != 0.0) 
	{
		//vec4 result = texture2D(uMainSampler, targetVec);
		vec4 result = gl_FragColor;

		if (!_blurOnlyEmpty || result.a < 0.1) {
			if (_motionBlurDual) {
				for (float i = 1.0; i < mbSamplesLoopDual; ++i) {
					float modVal = 1.0 - (i * _blurFade);
					vec2 offset = _motionBlurValue * (i * mbSamplesDualInv);
					result += texture2D(uMainSampler, targetVec + offset) * modVal;
					result += texture2D(uMainSampler, targetVec - offset) * modVal;
				}
			}
			else {
				for (float i = 1.0; i < mbSamplesLoop; ++i) {
					float modVal = 1.0 - (i * _blurFade);
					vec2 offset = _motionBlurValue * (i * mbSamplesInv);
					result += texture2D(uMainSampler, targetVec + offset) * modVal;
				}
			}

			result *= _motionBlurMult; // 1/(9 - 20 * _blurFade)

			if (_blurUseRef) {
				gl_FragColor = vec4((result.rgb + _blurRefColor * (1.0-result.a)), result.a * _blurIntensity);
			}
			else gl_FragColor = result;
		}
	}

	float straightAlpha = gl_FragColor.a;
	if (straightAlpha > 0.0) gl_FragColor.rgb /= straightAlpha;

	// ---------------------
	// GRAYSCALE
	// ---------------------
	if (_grayscaleValue > 0.0) {
		float gray = !_grayscaleUseLum ? (gl_FragColor.r + gl_FragColor.g + gl_FragColor.b)*0.333 : dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));

		gl_FragColor.rgb = gl_FragColor.rgb*(1.0-_grayscaleValue) + vec3(gray)*_grayscaleValue*_grayscaleTint;
	}

	// ---------------------
	// SEPIA
	// ---------------------
	if (_sepiaValue > 0.0) {
		vec4 texColor = gl_FragColor * sepiaMat;
		gl_FragColor.rgb = gl_FragColor.rgb*(1.0-_sepiaValue) + texColor.rgb*_sepiaValue;
	}

	// ---------------------
	// INVERTCOLOR
	// ---------------------
	if (_invertColorValue.a > 0.0) {
		vec4 texColor = 1.0 - gl_FragColor;
		gl_FragColor.rgb = gl_FragColor.rgb * (1.0 - _invertColorValue.rgb) + texColor.rgb * _invertColorValue.rgb;
	}

	// ---------------------
	// HUESHIFT
	// ---------------------
	if (_hueShiftCosA != 0.0) {
		gl_FragColor.rgb = vec3(gl_FragColor.rgb * _hueShiftCosA + cross(_hueShiftK, gl_FragColor.rgb) * _hueShiftSinA + _hueShiftK * dot(_hueShiftK, gl_FragColor.rgb) * (1.0 - _hueShiftCosA));
	}

	// ---------------------
	// COLORCHANGE
	// ---------------------
	if (_colorChangeC.r > 0.0) {
		gl_FragColor.rgb = gl_FragColor.rgb * _colorChangeC + _colorChangeB;
	}

	// ---------------------
	// LENSCIRCLE
	// ---------------------
	if (_lensCircleStrength > 0.0) {
        float dist = distance(outTexCoord * _textureScaleInv * vec2(1.0, _screenAspect), _lensCircleOrigin);
        float k = _lensCircleStart == _lensCircleEnd ? ((dist >= _lensCircleEnd ? _lensCircleStrength : 0.0)) : _lensCircleStrength * (1.0 - smoothstep(_lensCircleEnd, _lensCircleStart, dist));
		if (_lensCircleAdditive) gl_FragColor.rgb = gl_FragColor.rgb + (_lensCircleTint * k);
		else gl_FragColor.rgb = gl_FragColor.rgb * (1.0 - k) + (_lensCircleTint * k);
	}

	gl_FragColor.rgb *= straightAlpha;
}
`;

  class GDShaderPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
      super({ game, name: "GDShaderPipeline", fragShader: GD_SHADER_SOURCE });
      this.uniformValues = null;
    }

    onPreRender() {
      const u = this.uniformValues;
      if (!u) return;
      this.set2f("_textureScale", 1, 1);
      this.set2f("_textureScaleInv", 1, 1);
      this.set1f("_screenAspect", u.aspect);
      this.set1f("_screenAspectInv", 1 / u.aspect);
      this.set2f("_pixelSize", u.pixelSize[0], u.pixelSize[1]);
      this.set1f("_rowmod", u.rowmod);
      this.set1f("_colmod", u.colmod);
      this.set1f("_rowmodCalc", 1 - u.rowmod);
      this.set1f("_colmodCalc", 1 - u.colmod);
      this.set1f("_splitXStart", 0);
      this.set1f("_splitXRange", 1);
      this.set1f("_splitXRangeMult", 1);
      this.set1f("_splitYStart", 0);
      this.set1f("_splitYRange", 1);
      this.set1f("_splitYRangeMult", 1);
      this.set1f("_grayscaleValue", u.grayscale);
      this.set3f("_grayscaleTint", u.grayscaleTint[0], u.grayscaleTint[1], u.grayscaleTint[2]);
      this.set1i("_grayscaleUseLum", u.grayscaleUseLum ? 1 : 0);
      this.set1f("_sepiaValue", u.sepia);
      this.set4f("_invertColorValue", u.invert[0], u.invert[1], u.invert[2], u.invert[3]);
      this.set1f("_hueShiftCosA", u.hueCos);
      this.set1f("_hueShiftSinA", u.hueSin);
      this.set3f("_colorChangeC", u.colorC[0], u.colorC[1], u.colorC[2]);
      this.set3f("_colorChangeB", u.colorB[0], u.colorB[1], u.colorB[2]);
      this.set1f("_chromaticXOff", u.chromaticX);
      this.set1f("_chromaticYOff", u.chromaticY);
      this.set1f("_cGRGBOffset", u.cgRGB);
      this.set1f("_cGTime", u.cgTime);
      this.set1f("_cGYOffset", u.cgYOffset);
      this.set1f("_cGStrength", u.cgStrength);
      this.set1f("_cGHeight", u.cgHeight);
      this.set1f("_cGLineStrength", u.cgLineStrength);
      this.set1f("_cGLineThick", u.cgLineThick);
      this.set2f("_lensCircleOrigin", u.lensOrigin[0], u.lensOrigin[1]);
      this.set1f("_lensCircleStart", u.lensStart);
      this.set1f("_lensCircleEnd", u.lensEnd);
      this.set1f("_lensCircleStrength", u.lensStrength);
      this.set3f("_lensCircleTint", u.lensTint[0], u.lensTint[1], u.lensTint[2]);
      this.set1i("_lensCircleAdditive", u.lensAdditive ? 1 : 0);
      this.set2f("_bulgeOrigin", u.bulgeOrigin[0], u.bulgeOrigin[1]);
      this.set1f("_bulgeValue", u.bulgeValue);
      this.set1f("_bulgeValue2", u.bulgeValue2);
      this.set1f("_bulgeRadius", u.bulgeRadius);
      this.set2f("_radialBlurCenter", u.radialCenter[0], u.radialCenter[1]);
      this.set1f("_radialBlurValue", u.radialValue);
      this.set1f("_blurFade", u.blurFade);
      this.set2f("_motionBlurValue", u.motionValue[0], u.motionValue[1]);
      this.set1f("_motionBlurMult", u.motionMult);
      this.set1i("_motionBlurDual", u.motionDual ? 1 : 0);
      this.set1i("_blurUseRef", 0);
      this.set1i("_blurOnlyEmpty", u.blurOnlyEmpty ? 1 : 0);
      this.set1f("_blurIntensity", u.blurIntensity);
      this.set1f("_glitchTop", u.glitch ? u.glitch.top : 0);
      if (u.glitch) {
        this.set1f("_glitchBot", u.glitch.bot);
        this.set1f("_glitchXOffset", u.glitch.xOffset);
        this.set2f("_glitchColOffset", u.glitch.colX, u.glitch.colY);
        this.set1f("_glitchRnd", u.glitch.rnd);
      }
      this.set2f("_pinchValue", u.pinchValue[0], u.pinchValue[1]);
      this.set2f("_pinchCenterPos", u.pinchCenter[0], u.pinchCenter[1]);
      this.set2f("_pinchCalc1", u.pinchCalc[0], u.pinchCalc[1]);
      this.set1f("_pinchRadius", u.pinchRadius);
      const sl = u.shockLine;
      this.set1f("_shockLineTime", sl ? sl.time : 0);
      if (sl) {
        this.set1f("_shockLineTime1", sl.time1);
        this.set1f("_shockLineTime2", sl.time2);
        this.set1f("_shockLineTime3", sl.time3);
        this.set1f("_shockLineTime4", sl.time4);
        this.set1i("_shockLineAxis", sl.axis ? 1 : 0);
        this.set1i("_shockLineDirection", sl.direction ? 1 : 0);
        this.set1i("_shockLineDual", sl.dual ? 1 : 0);
        this.set1f("_shockLineWaves", sl.waves);
        this.set2f("_shockLineStrength", sl.strength, sl.strength);
        this.set1f("_shockLineCenter", sl.center);
        this.set1f("_shockLineMaxDistVal", sl.maxDist);
      }
      const sw = u.shockWave;
      this.set1f("_shockWaveTime", sw ? sw.time : 0);
      if (sw) {
        this.set1f("_shockWaveTime1", sw.time1);
        this.set1f("_shockWaveTime2", sw.time2);
        this.set1f("_shockWaveTime3", sw.time3);
        this.set1f("_shockWaveTime4", sw.time4);
        this.set1f("_shockWaveStrength", sw.strength);
        this.set1f("_shockWaveWaves", sw.waves);
        this.set2f("_shockWaveCenter", sw.center[0], sw.center[1]);
        this.set1i("_shockWaveInvert", sw.invert ? 1 : 0);
        this.set1f("_shockWaveMinSize", sw.minSize);
        this.set1f("_shockWaveMaxSize", sw.maxSize);
        this.set1f("_shockWaveMaxDistVal", sw.maxDist);
      }
    }
  }
  window.GDShaderPipeline = GDShaderPipeline;

  const SHADER_DEFAULTS = {
    grayscale: 0,
    sepia: 0,
    invert: 0,
    invertR: 1,
    invertG: 1,
    invertB: 1,
    hue: 0,
    colorR: 1,
    colorG: 1,
    colorB: 1,
    colorAddR: 0,
    colorAddG: 0,
    colorAddB: 0,
    chromaticX: 0,
    chromaticY: 0,
    cgSpeed: 0,
    cgHeight: 0,
    cgStrength: 0,
    cgLineFade: 0,
    cgLineThick: 0,
    cgRGB: 0,
    lensSize: 0,
    lensFade: 0,
    lensStrength: 0,
    lensOffX: 0,
    lensOffY: 0,
    bulge: 0,
    bulgeRadius: 0,
    bulgeOffX: 0,
    bulgeOffY: 0,
    radial: 0,
    radialIntensity: 0,
    radialFade: 0,
    radialOffX: 0,
    radialOffY: 0,
    swSpeed: 0,
    swThick: 0,
    swStrength: 0,
    swWidth: 0,
    swFadeIn: 0,
    swFadeOut: 0,
    swMin: 0,
    swOffX: 0,
    swOffY: 0,
    swMax: 0,
    swMaxDist: 0,
    swTimeOff: 0,
    slSpeed: 0,
    slThick: 0,
    slStrength: 0,
    slWidth: 0,
    slFadeIn: 0,
    slFadeOut: 0,
    slOff: 0,
    slMaxDist: 0,
    slTimeOff: 0,
    pinchX: 0,
    pinchY: 0,
    pinchOffX: 0,
    pinchOffY: 0,
    pinchRadius: 0,
    pinchModX: 0,
    pinchModY: 0,
    glitch: 0,
    motionX: 0,
    motionY: 0,
    motionIntensity: 0,
    motionFade: 0,
    splitRows: 0,
    splitCols: 0,
    pixelX: 1,
    pixelY: 1
  };

  const rawValue = (raw, key) => raw?.[key] ?? raw?.[String(key)];
  const rawFloat = (raw, key, fallback = 0) => {
    const parsed = parseFloat(rawValue(raw, key) ?? fallback);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const rawInt = (raw, key, fallback = 0) => {
    const parsed = parseInt(rawValue(raw, key) ?? fallback, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const rawBool = (raw, key) => String(rawValue(raw, key) ?? "0") === "1";

  const proto = window.LevelObject.prototype;

  proto.resetShaders = function () {
    this.shaderValues = { ...SHADER_DEFAULTS };
    this._shaderTweens = new Map();
    this._grayscaleChannel = 0;
    this._grayscaleUseLum = false;
    this._invertClamp = false;
    this._chromaticRelative = false;
    this._cgEnabled = false;
    this._cgRelative = false;
    this._cgFollowCamera = false;
    this._cgTime = 0;
    this._shaderClock = 0;
    this._lensTarget = 0;
    this._lensChannel = 0;
    this._lensRelative = false;
    this._bulgeTarget = 0;
    this._bulgeRelative = false;
    this._radialTarget = 0;
    this._radialOnlyEmpty = false;
    this._swActive = false;
    this._swTime = 0;
    this._swInvert = false;
    this._swTarget = 0;
    this._swRelative = false;
    this._slActive = false;
    this._slTime = 0;
    this._slFlags = { axis: false, direction: false, dual: false, flip: false };
    this._slTarget = 0;
    this._slRelative = false;
    this._pinchTarget = 0;
    this._pinchRelative = false;
    this._motion = { targetX: 0, targetY: 0, easeX: 0, easeY: 0, dual: false, relative: false, onlyEmpty: false, speedX: 0, speedY: 0, lastX: null, lastY: null };
    this._pixelRelative = false;
    this._glitch = { speed: 0, height: 0, sliceX: 0, colX: 0, colY: 0, relative: false };
    this.shaderLayerMin = 1;
    this.shaderLayerMax = 15;
  };

  proto._parseShaderTrigger = function (trig, raw) {
    trig.shaderId = trig.objectId;
    trig.duration = Math.max(0, rawFloat(raw, 10));
    trig.easingType = rawInt(raw, 30);
    const rate = rawFloat(raw, 85);
    trig.easingRate = rate > 0 ? rate : 2;
    trig.value = rawFloat(raw, 176);
    trig.v175 = rawFloat(raw, 175, 1);
    trig.v176 = rawFloat(raw, 176, 1);
    trig.v191 = rawFloat(raw, 191, 1);
    trig.v179 = rawFloat(raw, 179);
    trig.v180 = rawFloat(raw, 180);
    trig.v189 = rawFloat(raw, 189);
    trig.r175 = rawFloat(raw, 175);
    trig.r176 = rawFloat(raw, 176);
    trig.r191 = rawFloat(raw, 191);
    trig.r179 = rawFloat(raw, 179);
    trig.r181 = rawFloat(raw, 181);
    trig.r290 = rawFloat(raw, 290);
    trig.r291 = rawFloat(raw, 291);
    trig.b515 = rawBool(raw, 515);
    trig.b184 = rawBool(raw, 184);
    trig.b185 = rawBool(raw, 185);
    trig.b186 = rawBool(raw, 186);
    trig.b187 = rawBool(raw, 187);
    trig.b513 = rawBool(raw, 513);
    trig.r177 = rawFloat(raw, 177);
    trig.r180 = rawFloat(raw, 180);
    trig.r182 = rawFloat(raw, 182);
    trig.r183 = rawFloat(raw, 183);
    trig.r512 = rawFloat(raw, 512);
    trig.r189 = rawFloat(raw, 189);
    trig.p1 = rawBool(raw, 138);
    trig.p2 = rawBool(raw, 200);
    trig.centerGroup = rawInt(raw, 71);
    trig.b188 = rawBool(raw, 188);
    trig.b190 = rawBool(raw, 190);
    trig.b192 = rawBool(raw, 192);
    trig.b194 = rawBool(raw, 194);
    trig.b514 = rawBool(raw, 514);
    trig.channel = rawInt(raw, 51);
    trig.layerMin = rawInt(raw, 196);
    trig.layerMax = rawInt(raw, 197);
  };

  proto._tweenShaderValue = function (name, target, trig) {
    if (trig.duration <= 0) {
      this._shaderTweens.delete(name);
      this.shaderValues[name] = target;
      return;
    }
    this._shaderTweens.set(name, { from: this.shaderValues[name], to: target, elapsed: 0, trig });
  };

  proto._fireShaderTrigger = function (trig) {
    switch (trig.shaderId) {
      case 2904:
        if (trig.b192) {
          this.resetShaders();
          break;
        }
        this.shaderLayerMin = trig.layerMin < 2 ? 1 : trig.layerMin;
        this.shaderLayerMax = trig.layerMax > 0 ? trig.layerMax : 15;
        break;
      case 2910:
        if (trig.b188) this._tweenShaderValue("chromaticX", trig.v180, trig);
        if (trig.b190) this._tweenShaderValue("chromaticY", trig.v189, trig);
        this._chromaticRelative = trig.b514;
        break;
      case 2911:
        if (!this._cgEnabled) this._cgTime = this._shaderClock;
        this._cgEnabled = !trig.b192;
        this._tweenShaderValue("cgSpeed", trig.r175, trig);
        this._tweenShaderValue("cgHeight", 1 / Math.max(0.1, trig.v189), trig);
        this._tweenShaderValue("cgStrength", trig.r176, trig);
        this._tweenShaderValue("cgLineFade", trig.v179, trig);
        this._tweenShaderValue("cgLineThick", trig.r191, trig);
        this._tweenShaderValue("cgRGB", trig.v180, trig);
        this._cgRelative = trig.b514;
        this._cgFollowCamera = trig.b194;
        break;
      case 2913:
        this._lensTarget = trig.p1 ? -1 : trig.p2 ? -2 : trig.channel;
        this._lensChannel = trig.centerGroup;
        this._lensRelative = trig.b514;
        this._tweenShaderValue("lensStrength", Math.max(0, Math.min(1, trig.r176)), trig);
        this._tweenShaderValue("lensSize", trig.r179, trig);
        this._tweenShaderValue("lensFade", trig.r181, trig);
        this._tweenShaderValue("lensOffX", trig.r290, trig);
        this._tweenShaderValue("lensOffY", trig.r291, trig);
        break;
      case 2905: {
        const tweenTrig = trig.b513 ? trig : { ...trig, duration: 0 };
        if (!trig.b513) {
          this._swTime = 0;
          this._swInvert = trig.b184;
          this._swTarget = trig.b188 ? (trig.p1 ? -1 : trig.p2 ? -2 : trig.channel) : 0;
          this._swRelative = trig.b514;
        }
        this._swActive = true;
        this._tweenShaderValue("swSpeed", trig.r175, tweenTrig);
        this._tweenShaderValue("swThick", trig.r180, tweenTrig);
        this._tweenShaderValue("swStrength", trig.r176, tweenTrig);
        this._tweenShaderValue("swWidth", trig.r179, tweenTrig);
        this._tweenShaderValue("swFadeIn", trig.r181, tweenTrig);
        this._tweenShaderValue("swFadeOut", trig.r182, tweenTrig);
        this._tweenShaderValue("swMin", trig.r183, tweenTrig);
        this._tweenShaderValue("swOffX", trig.r290, tweenTrig);
        this._tweenShaderValue("swOffY", trig.r291, tweenTrig);
        this._tweenShaderValue("swMax", trig.r191, tweenTrig);
        this._tweenShaderValue("swMaxDist", trig.r512, tweenTrig);
        this._tweenShaderValue("swTimeOff", trig.r177, tweenTrig);
        break;
      }
      case 2907: {
        const tweenTrig = trig.b513 ? trig : { ...trig, duration: 0 };
        if (!trig.b513) {
          this._slTime = 0;
          this._slFlags = { axis: trig.b186, direction: trig.b185, dual: trig.b187, flip: trig.b184 };
          this._slTarget = trig.b188 ? (trig.p1 ? -1 : trig.p2 ? -2 : trig.channel) : 0;
          this._slRelative = trig.b514;
        }
        this._slActive = true;
        this._tweenShaderValue("slSpeed", trig.r175, tweenTrig);
        this._tweenShaderValue("slThick", trig.r180, tweenTrig);
        this._tweenShaderValue("slStrength", trig.r176, tweenTrig);
        this._tweenShaderValue("slWidth", trig.r179, tweenTrig);
        this._tweenShaderValue("slFadeIn", trig.r181, tweenTrig);
        this._tweenShaderValue("slFadeOut", trig.r182, tweenTrig);
        this._tweenShaderValue("slOff", trig.r290, tweenTrig);
        this._tweenShaderValue("slMaxDist", trig.r512, tweenTrig);
        this._tweenShaderValue("slTimeOff", trig.r177, tweenTrig);
        break;
      }
      case 2917: {
        const target = trig.b188 ? (trig.p1 ? -1 : trig.p2 ? -2 : trig.channel) : 0;
        this._pinchRelative = trig.b514;
        if (trig.b190) {
          this._pinchTarget = target;
          this._tweenShaderValue("pinchX", trig.r180, trig);
          this._tweenShaderValue("pinchOffX", trig.r290, trig);
          this._tweenShaderValue("pinchRadius", trig.r512, trig);
          this._tweenShaderValue("pinchModX", trig.r179, trig);
        }
        if (trig.b194) {
          this._pinchTarget = target;
          this._tweenShaderValue("pinchY", trig.r189, trig);
          this._tweenShaderValue("pinchOffY", trig.r291, trig);
          this._tweenShaderValue("pinchRadius", trig.r512, trig);
          this._tweenShaderValue("pinchModY", trig.r179, trig);
        }
        break;
      }
      case 2909:
        this._tweenShaderValue("glitch", trig.r176, { ...trig, easingType: 0 });
        this._motion = { targetX: 0, targetY: 0, easeX: 0, easeY: 0, dual: false, relative: false, onlyEmpty: false, speedX: 0, speedY: 0, lastX: null, lastY: null };
    this._glitch = { speed: trig.r175, height: trig.r179, sliceX: trig.r191, colX: trig.r181, colY: trig.r182, relative: trig.b514 };
        break;
      case 2915: {
        const m = this._motion;
        const target = trig.p1 ? -1 : trig.p2 ? -2 : trig.channel;
        const fixed = { ...trig, duration: trig.duration, easingType: 0 };
        m.dual = trig.b194;
        m.relative = trig.b514;
        m.onlyEmpty = trig.b515;
        if (trig.b188) {
          m.targetX = target;
          m.easeX = trig.r191;
          this._tweenShaderValue("motionX", trig.r180, trig);
        }
        if (trig.b190) {
          m.targetY = target;
          m.easeY = trig.r191;
          this._tweenShaderValue("motionY", trig.r189, trig);
        }
        if (trig.b188 || trig.b190) {
          this._tweenShaderValue("motionIntensity", trig.r176, fixed);
          this._tweenShaderValue("motionFade", trig.r181, fixed);
        }
        break;
      }
      case 2912:
        this._pixelRelative = trig.b514;
        if (trig.b188) {
          if (this.shaderValues.pixelX < 1) this.shaderValues.pixelX = 1;
          this._tweenShaderValue("pixelX", trig.r180, trig);
        }
        if (trig.b190) {
          if (this.shaderValues.pixelY < 1) this.shaderValues.pixelY = 1;
          this._tweenShaderValue("pixelY", trig.r189, trig);
        }
        break;
      case 2924:
        if (trig.b188) this._tweenShaderValue("splitCols", trig.r180, trig);
        if (trig.b190) this._tweenShaderValue("splitRows", trig.r189, trig);
        break;
      case 2914:
        this._radialTarget = trig.b188 ? (trig.p1 ? -1 : trig.p2 ? -2 : trig.channel) : 0;
        this._radialOnlyEmpty = trig.b515;
        this._tweenShaderValue("radial", trig.r179, trig);
        this._tweenShaderValue("radialIntensity", trig.r176, trig);
        this._tweenShaderValue("radialFade", trig.r181, trig);
        this._tweenShaderValue("radialOffX", trig.r290, trig);
        this._tweenShaderValue("radialOffY", trig.r291, trig);
        break;
      case 2916:
        this._bulgeTarget = trig.b188 ? (trig.p1 ? -1 : trig.p2 ? -2 : trig.channel) : 0;
        this._bulgeRelative = trig.b514;
        this._tweenShaderValue("bulge", trig.r176, trig);
        this._tweenShaderValue("bulgeOffX", trig.r290, trig);
        this._tweenShaderValue("bulgeOffY", trig.r291, trig);
        this._tweenShaderValue("bulgeRadius", trig.v180, trig);
        break;
      case 2919:
        if (trig.b190) this._grayscaleChannel = trig.channel;
        this._grayscaleUseLum = trig.b188;
        this._tweenShaderValue("grayscale", trig.value, trig);
        break;
      case 2920:
        this._tweenShaderValue("sepia", trig.value, trig);
        break;
      case 2921:
        if (trig.b188) {
          this._invertClamp = trig.b194;
          if (trig.b190) {
            this._tweenShaderValue("invertR", trig.v179, trig);
            this._tweenShaderValue("invertG", trig.v180, trig);
            this._tweenShaderValue("invertB", trig.v189, trig);
          } else {
            this.shaderValues.invertR = trig.v179;
            this.shaderValues.invertG = trig.v180;
            this.shaderValues.invertB = trig.v189;
          }
        }
        this._tweenShaderValue("invert", trig.value, trig);
        break;
      case 2922:
        this._tweenShaderValue("hue", trig.value, trig);
        break;
      case 2923:
        this._tweenShaderValue("colorR", trig.v175, trig);
        this._tweenShaderValue("colorG", trig.v176, trig);
        this._tweenShaderValue("colorB", trig.v191, trig);
        this._tweenShaderValue("colorAddR", trig.v179, trig);
        this._tweenShaderValue("colorAddG", trig.v180, trig);
        this._tweenShaderValue("colorAddB", trig.v189, trig);
        break;
    }
  };

  proto.stepShaders = function (dt) {
    this._shaderClock += dt;
    if (this._swActive) this._swTime += this.shaderValues.swSpeed * dt;
    if (this._slActive) this._slTime += this.shaderValues.slSpeed * dt;
    this._stepMotionBlurSpeed(dt);
    if (this._cgEnabled) {
      const t = this._cgTime + this.shaderValues.cgSpeed * dt;
      this._cgTime = Math.trunc(t) % 1000 + (t - Math.trunc(t));
    }
    for (const [name, tween] of this._shaderTweens) {
      tween.elapsed += dt;
      const progress = Math.min(tween.elapsed / tween.trig.duration, 1);
      const sample = Easing.sample(tween.trig.easingType, tween.trig.easingRate, progress);
      this.shaderValues[name] = tween.from + (tween.to - tween.from) * sample;
      if (progress >= 1) this._shaderTweens.delete(name);
    }
  };

  proto._shaderWorldPos = function (target) {
    const scene = this._scene;
    if (!scene) return null;
    if (target === -1 || target === -2) {
      const state = target === -2 && scene._isDual ? scene._state2 : scene._state;
      return state ? [(scene._playerWorldX || 0) / 2, (state.y || 0) / 2] : null;
    }
    if (target > 0) {
      const guide = this._cameraGuides?.get(target);
      if (guide) return [guide.x / 2, guide.y / 2];
      const c = this._getGroupCenter(target);
      return [c.cx / 2, (T - c.cy) / 2];
    }
    return [(scene._cameraX || 0) / 2, (scene._cameraY || 0) / 2];
  };

  proto._stepMotionBlurSpeed = function (dt) {
    const m = this._motion;
    if (!m || (this.shaderValues.motionX === 0 && this.shaderValues.motionY === 0) || dt <= 0) {
      if (m) m.lastX = m.lastY = null;
      return;
    }
    const ticks = dt * 240;
    const frames = dt * 60;
    const step = (axis, target, ease, key, lastKey) => {
      if (!target) return;
      const pos = this._shaderWorldPos(target);
      if (!pos) return;
      const value = pos[axis];
      const raw = m[lastKey] === null ? 0 : (value - m[lastKey]) / ticks;
      m[lastKey] = value;
      m[key] = ease > 1 ? m[key] + (raw - m[key]) / (ease / frames) : raw;
    };
    step(0, m.targetX, m.easeX, "speedX", "lastX");
    step(1, m.targetY, m.easeY, "speedY", "lastY");
  };

  proto._shaderScreenPos = function (target) {
    const scene = this._scene;
    if (!scene) return null;
    let x, y;
    if (target === -1 || target === -2) {
      const player = target === -2 && scene._isDual ? scene._player2 : scene._player;
      if (!player || !Number.isFinite(player._lastScreenX)) return null;
      x = player._lastScreenX;
      y = player._lastScreenY;
    } else if (target > 0) {
      const guide = this._cameraGuides?.get(target);
      if (guide) {
        x = guide.x - (scene._cameraX || 0);
        y = (T - guide.y) + (scene._cameraY || 0);
      } else {
        const c = this._getGroupCenter(target);
        if (!c.cx && !c.cy) return null;
        x = c.cx - (scene._cameraX || 0);
        y = c.cy + (scene._cameraY || 0);
      }
    } else {
      return null;
    }
    const zoom = this.cameraZoom || 1;
    x = (x - screenWidth / 2) * zoom + screenWidth / 2;
    y = (y - screenHeight / 2) * zoom + screenHeight / 2;
    return [x / screenWidth, 1 - y / screenHeight];
  };

  proto.getShaderUniforms = function () {
    const v = this.shaderValues;
    const glitch = this._cgEnabled && (v.cgRGB !== 0 || v.cgStrength !== 0 || v.cgLineThick !== 0);
    const active = glitch || v.grayscale > 0 || v.sepia > 0 || v.invert > 0 || v.hue !== 0 || v.chromaticX !== 0 || v.chromaticY !== 0 ||
      v.colorR !== 1 || v.colorG !== 1 || v.colorB !== 1 || v.colorAddR !== 0 || v.colorAddG !== 0 || v.colorAddB !== 0 || v.lensStrength > 0 || v.bulge > 0 || v.radial !== 0 || (this._swActive && v.swStrength > 0) || (this._slActive && v.slStrength > 0) || v.pinchX !== 0 || v.pinchY !== 0 || v.glitch > 0 || v.motionX !== 0 || v.motionY !== 0 || v.splitRows !== 0 || v.splitCols !== 0 || v.pixelX > 1 || v.pixelY > 1;
    if (!active) return null;
    let tint = [1, 1, 1];
    if (this._grayscaleChannel > 0) {
      const color = this._scene?._colorManager?.getColor?.(this._grayscaleChannel);
      if (color) tint = [color.r / 255, color.g / 255, color.b / 255];
    }
    let invert = [v.invert * v.invertR, v.invert * v.invertG, v.invert * v.invertB];
    if (this._invertClamp) invert = invert.map(c => Math.min(c, 1));
    const radians = v.hue * 0.017453292;
    const colorIdentity = v.colorR === 1 && v.colorG === 1 && v.colorB === 1 && v.colorAddR === 0 && v.colorAddG === 0 && v.colorAddB === 0;
    const chromaticScale = this._chromaticRelative ? (this.cameraZoom || 1) : 1;
    const cgScale = this._cgRelative ? Math.abs(this.cameraZoom || 1) : 1;
    const cgLine = Math.max(0.001, 1 - 0.2 * cgScale * v.cgLineFade);
    const aspect = screenHeight / screenWidth;
    let lensOrigin = [0.5, 0.5];
    let lensStart = 0, lensEnd = 0, lensTint = [0, 0, 0], lensAdditive = false;
    if (v.lensStrength > 0) {
      const pos = this._lensTarget ? this._shaderScreenPos(this._lensTarget) : null;
      lensOrigin = pos || [0.5 + v.lensOffX * 0.5, 0.5 + v.lensOffY * 0.5];
      lensOrigin = [lensOrigin[0], lensOrigin[1] * aspect];
      const size = (this._lensRelative ? Math.abs(this.cameraZoom || 1) : 1) * v.lensSize;
      lensEnd = Math.max(0, size);
      lensStart = Math.max(0, size - Math.max(0, v.lensFade));
      if (this._lensChannel > 0) {
        const color = this._scene?._colorManager?.getColor?.(this._lensChannel);
        if (color) lensTint = [color.r / 255, color.g / 255, color.b / 255];
        lensAdditive = !!this._channelBlending?.[this._lensChannel];
      }
    }
    let bulgeOrigin = [0.5, 0.5], bulgeValue = 0, bulgeValue2 = 0, bulgeRadius = 0;
    if (v.bulge > 0) {
      const pos = this._bulgeTarget ? this._shaderScreenPos(this._bulgeTarget) : null;
      bulgeOrigin = pos || [0.5 + v.bulgeOffX * 0.5, 0.5 + v.bulgeOffY * 0.5];
      const scale = this._bulgeRelative ? Math.abs(this.cameraZoom || 1) : 1;
      const half = 0.5 * scale * Math.SQRT2;
      bulgeValue = Math.max(0.001, Math.PI / half * 0.45 * v.bulge);
      bulgeValue2 = half / Math.tan(half * bulgeValue);
      bulgeRadius = scale * v.bulgeRadius;
    }
    let radialCenter = [0.5, 0.5];
    if (v.radial !== 0) {
      const pos = this._radialTarget ? this._shaderScreenPos(this._radialTarget) : null;
      radialCenter = pos || [0.5 + v.radialOffX * 0.5, 0.5 + v.radialOffY * 0.5];
    }
    let shockWave = null;
    if (this._swActive && v.swStrength > 0) {
      const scale = this._swRelative ? Math.abs(this.cameraZoom || 1) : 1;
      const w = v.swThick <= 0.001 ? 0.0002 : v.swThick * 0.2;
      const fadeIn = v.swFadeIn * w;
      const t = this._swTime + v.swTimeOff * 0.1;
      const outer = t * (this._swInvert ? 1 : t) - fadeIn;
      const inner = Math.min(outer, outer - w);
      const end = Math.min(inner, inner - v.swFadeOut * w);
      const waves = 22 / Math.max(0.001, v.swWidth);
      const pos = this._swTarget ? this._shaderScreenPos(this._swTarget) : null;
      shockWave = {
        time: t * waves,
        time1: (fadeIn + outer + 0.001) * scale,
        time2: outer * scale,
        time3: (inner + 0.001) * scale,
        time4: end * scale,
        strength: scale * v.swStrength * 0.1,
        waves: waves / scale,
        center: pos || [0.5 + v.swOffX * 0.5, 0.5 + v.swOffY * 0.5],
        invert: this._swInvert,
        minSize: scale * v.swMin * 0.5,
        maxSize: scale * v.swMax,
        maxDist: v.swMaxDist !== 0 ? 1 / (v.swMaxDist * 0.5 * scale) : 0
      };
    }
    let shockLine = null;
    if (this._slActive && v.slStrength > 0) {
      const f = this._slFlags;
      const scale = this._slRelative ? Math.abs(this.cameraZoom || 1) : 1;
      const w = v.slThick <= 0.001 ? 0.0002 : v.slThick * 0.2;
      const fadeIn = v.slFadeIn * w;
      const fadeOut = v.slFadeOut * w;
      let t = this._slTime + v.slTimeOff * 0.1;
      if (f.flip) t = (f.dual ? 0.5 : 1) * (fadeOut + w + fadeIn) - t;
      const outer = t - fadeIn;
      const inner = Math.min(outer, outer - w);
      const end = Math.min(inner, inner - fadeOut);
      const waves = 22 / Math.max(0.001, v.slWidth);
      const pos = this._slTarget ? this._shaderScreenPos(this._slTarget) : null;
      shockLine = {
        time: t * waves,
        time1: (fadeIn + outer + 0.001) * scale,
        time2: outer * scale,
        time3: (inner + 0.001) * scale,
        time4: end * scale,
        axis: f.axis,
        direction: f.direction,
        dual: f.dual,
        waves: waves / scale,
        strength: v.slStrength * 0.01 * scale,
        center: pos ? pos[f.axis ? 1 : 0] : 0.5 + v.slOff * 0.5,
        maxDist: v.slMaxDist !== 0 ? 1 / (v.slMaxDist * 0.5 * scale) : 0
      };
    }
    let pinchValue = [0, 0], pinchCenter = [0.5, 0.5], pinchCalc = [1, 1], pinchRadius = 0;
    if (v.pinchX !== 0 || v.pinchY !== 0) {
      const px = v.pinchX === 0 && v.pinchY !== 0 ? 0.001 : v.pinchX;
      const yOnly = v.pinchY === 0 && px !== 0;
      pinchValue = [px * -0.1, yOnly ? -0.0001 : v.pinchY * -0.1];
      const pos = this._pinchTarget ? this._shaderScreenPos(this._pinchTarget) : null;
      pinchCenter = pos || [0.5 + v.pinchOffX * 0.5, 0.5 + v.pinchOffY * 0.5];
      const scale = this._pinchRelative ? Math.abs(this.cameraZoom || 1) : 1;
      pinchRadius = scale * v.pinchRadius;
      const mx = Math.max(v.pinchModX, 0.001);
      const my = Math.max(v.pinchModY, 0.001);
      pinchCalc = [mx / Math.atan(pinchValue[0] * -20 * mx), my / Math.atan(pinchValue[1] * -20 * my)];
    }
    let glitchFx = null;
    if (v.glitch > 0) {
      const g = this._glitch;
      const scale = g.relative ? Math.abs(this.cameraZoom || 1) : 1;
      const seed = Math.floor(this._shaderClock * g.speed * 20);
      const rnd = c => {
        const x = Math.fround(Math.sin(seed * 12.9898 + c * 4.1414) * 43758.547);
        return x - Math.floor(x);
      };
      const bot = scale * rnd(2345);
      let top = bot + scale * v.glitch * g.height * rnd(9035);
      top += Math.floor(top);
      const maxX = scale * v.glitch * g.sliceX * 0.02;
      const colX = scale * g.colX * v.glitch * 0.02;
      const colY = scale * v.glitch * g.colY * 0.02;
      glitchFx = {
        bot: bot / aspect,
        top: top / aspect,
        xOffset: rnd(9625) * maxX * 2 - maxX,
        colX: rnd(9545) * colX * 2 - colX,
        colY: (rnd(7205) * colY * 2 - colY) / aspect,
        rnd: rnd(9545)
      };
    }
    let motionValue = [0, 0], motionMult = 1, motionDual = false;
    if (v.radial === 0 && (v.motionX !== 0 || v.motionY !== 0)) {
      const m = this._motion;
      const scale = m.relative ? Math.abs(this.cameraZoom || 1) : 1;
      const fx = m.targetX ? (m.speedX || 0.001) : 1;
      const fy = m.targetY ? (m.speedY || 0.001) : 1;
      motionValue = [scale * fx * v.motionX * 0.1, (1 / aspect) * scale * fy * v.motionY * 0.1];
      motionDual = m.dual;
    }
    const motionK = this._motion?.dual ? 0.2 : 0.1;
    const motionFade = Math.max(-motionK, Math.min(motionK, v.motionFade * motionK));
    motionMult = 1 / (9 + (this._motion?.dual ? -20 : -36) * motionFade);
    return {
      aspect,
      pixelSize: [
        v.pixelX > 1 ? Math.max(1, v.pixelX) * 2 * (this._pixelRelative ? Math.abs(this.cameraZoom || 1) : 1) / screenWidth : 0,
        v.pixelY > 1 ? Math.max(1, v.pixelY) * 2 * (this._pixelRelative ? Math.abs(this.cameraZoom || 1) : 1) / screenHeight : 0
      ],
      rowmod: v.splitRows + 1,
      colmod: v.splitCols + 1,
      motionValue,
      motionMult,
      motionDual,
      glitch: glitchFx,
      pinchValue,
      pinchCenter,
      pinchCalc,
      pinchRadius,
      shockLine,
      shockWave,
      radialCenter,
      radialValue: v.radial / 9 * 0.2,
      blurFade: v.radial !== 0 ? Math.min(0.2, Math.max(0, v.radialFade * 0.2)) : motionFade,
      blurOnlyEmpty: v.radial !== 0 ? this._radialOnlyEmpty : !!this._motion?.onlyEmpty,
      blurIntensity: (v.radial !== 0 ? v.radialIntensity : v.motionIntensity) + 1,
      bulgeOrigin,
      bulgeValue,
      bulgeValue2,
      bulgeRadius,
      lensOrigin,
      lensStart,
      lensEnd,
      lensStrength: v.lensStrength,
      lensTint,
      lensAdditive,
      cgRGB: glitch ? cgScale * (v.cgRGB * 0.1 !== 0 ? v.cgRGB * 0.01 : 0.0001) : 0,
      cgTime: this._cgTime,
      cgYOffset: this._cgFollowCamera ? -(this._scene?._cameraY || 0) / screenHeight : 0,
      cgStrength: cgScale * v.cgStrength * 0.02,
      cgHeight: v.cgHeight / (cgScale * screenWidth / screenHeight),
      cgLineStrength: v.cgLineThick * 0.05,
      cgLineThick: v.cgLineThick !== 0 ? cgLine : 0,
      chromaticX: v.chromaticX * 2 / screenWidth * chromaticScale,
      chromaticY: v.chromaticY * 2 / screenHeight * chromaticScale,
      grayscale: v.grayscale,
      grayscaleTint: tint,
      grayscaleUseLum: this._grayscaleUseLum,
      sepia: v.sepia,
      invert: [invert[0], invert[1], invert[2], v.invert],
      hueCos: v.hue !== 0 ? Math.cos(radians) : 0,
      hueSin: v.hue !== 0 ? Math.sin(radians) : 0,
      colorC: colorIdentity ? [0, 0, 0] : [Math.max(0.001, v.colorR), v.colorG, v.colorB],
      colorB: colorIdentity ? [0, 0, 0] : [v.colorAddR, v.colorAddG, v.colorAddB]
    };
  };
})();
