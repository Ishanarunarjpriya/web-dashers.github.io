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
      this.set1f("_colmod", 1);
      this.set1f("_rowmod", 1);
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
    cgRGB: 0
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

  proto.getShaderUniforms = function () {
    const v = this.shaderValues;
    const glitch = this._cgEnabled && (v.cgRGB !== 0 || v.cgStrength !== 0 || v.cgLineThick !== 0);
    const active = glitch || v.grayscale > 0 || v.sepia > 0 || v.invert > 0 || v.hue !== 0 || v.chromaticX !== 0 || v.chromaticY !== 0 ||
      v.colorR !== 1 || v.colorG !== 1 || v.colorB !== 1 || v.colorAddR !== 0 || v.colorAddG !== 0 || v.colorAddB !== 0;
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
    return {
      cgRGB: glitch ? cgScale * (v.cgRGB * 0.1 !== 0 ? v.cgRGB * 0.01 : 0.0001) : 0,
      cgTime: this._cgTime,
      cgYOffset: this._cgFollowCamera ? -(this._scene?._cameraY || 0) / screenHeight : 0,
      cgStrength: cgScale * v.cgStrength * 0.02,
      cgHeight: v.cgHeight / (cgScale * screenWidth / screenHeight),
      cgLineStrength: v.cgLineThick !== 0 ? cgLine : 0,
      cgLineThick: v.cgLineThick * 0.05,
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
