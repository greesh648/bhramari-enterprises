'use client';

import {useId} from 'react';

export type YogaPose = 'seated' | 'tree' | 'warrior' | 'dancer';

const poseLabels: Record<YogaPose, string> = {
  seated: 'A woman seated in a calm, cross-legged yoga pose',
  tree: 'A woman balancing in tree pose with her hands raised overhead',
  warrior: 'A woman practising a grounded warrior pose with outstretched arms',
  dancer: 'A woman balancing in an elegant dancer pose',
};

const skin = '#dddddd';
const clothing = '#333333';
const leggings = '#5a5a5a';
const hair = '#272727';

function Head({x, y, tilt = 0}: {x: number; y: number; tilt?: number}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt})`}>
      <path d='M-5 12 L-5 25 Q1 30 8 25 L6 12Z' fill={skin}/>
      <ellipse rx='12.5' ry='16' fill={skin}/>
      <circle cx='6' cy='-17' r='7.5' fill={hair}/>
      <path d='M-12 5 C-19-13-5-23 8-15 C17-10 16-1 12 6 L9-6 C0-3-6-6-10-9Z' fill={hair}/>
      <path d='M4 1 L8 1' stroke='#787878' strokeWidth='1' strokeLinecap='round'/>
    </g>
  );
}

function Seated() {
  return (
    <g className='yoga-person'>
      <path d='M172 211 C149 222 122 239 106 253 C99 260 106 270 118 270 C151 271 189 263 220 252' fill='none' stroke={leggings} strokeWidth='21' strokeLinecap='round'/>
      <path d='M188 211 C211 222 238 238 254 253 C262 260 254 270 242 269 C210 268 176 261 145 253' fill='none' stroke={clothing} strokeWidth='21' strokeLinecap='round'/>
      <path d='M211 252 Q219 245 227 248 Q231 251 225 254 L217 258Z' fill={skin}/>
      <path d='M151 254 Q143 246 136 249 Q133 252 139 256 L148 260Z' fill={skin}/>
      <path d='M163 145 C153 166 150 191 132 215 L117 229 M197 145 C207 166 211 191 229 215 L244 229' fill='none' stroke={skin} strokeWidth='10' strokeLinecap='round' strokeLinejoin='round'/>
      <path d='M112 231 Q118 225 123 228 L128 232 M238 231 Q244 225 249 229 L253 232' fill='none' stroke={skin} strokeWidth='5' strokeLinecap='round'/>
      <path d='M165 136 Q180 130 195 136 L201 167 Q194 186 200 210 Q180 217 160 210 Q166 186 159 167Z' fill={clothing}/>
      <path d='M168 138 Q180 144 192 138' fill='none' stroke='#8b8b8b' strokeWidth='1.1'/>
      <path d='M165 205 Q180 208 195 205' fill='none' stroke='#8b8b8b' strokeWidth='1'/>
      <Head x={180} y={108}/>
    </g>
  );
}

function Tree() {
  return (
    <g className='yoga-person'>
      <path d='M175 186 L168 244 L173 298' fill='none' stroke={clothing} strokeWidth='18' strokeLinecap='round' strokeLinejoin='round'/>
      <path d='M188 187 L226 222 L182 248' fill='none' stroke={leggings} strokeWidth='17' strokeLinecap='round' strokeLinejoin='round'/>
      <path d='M184 247 Q176 245 177 236 L180 230' fill='none' stroke={skin} strokeWidth='7' strokeLinecap='round'/>
      <path d='M173 296 L173 306 L187 308 Q192 311 185 312 L164 312 Q160 311 164 307 L166 297Z' fill={skin}/>
      <path d='M165 113 L146 84 Q151 67 176 38 M195 113 L212 84 Q207 66 184 38' fill='none' stroke={skin} strokeWidth='9' strokeLinecap='round' strokeLinejoin='round'/>
      <path d='M175 40 L178 29 Q181 25 181 34 L181 42 M184 40 L182 29' fill='none' stroke={skin} strokeWidth='4' strokeLinecap='round'/>
      <path d='M166 109 Q180 104 194 109 L199 144 Q192 165 198 188 Q180 194 161 188 Q168 165 162 143Z' fill={clothing}/>
      <path d='M168 112 Q180 118 192 112 M166 183 Q180 186 193 183' fill='none' stroke='#8b8b8b' strokeWidth='1'/>
      <Head x={180} y={80}/>
    </g>
  );
}

function Warrior() {
  return (
    <g className='yoga-person'>
      <path d='M176 208 L126 245 L125 297' fill='none' stroke={clothing} strokeWidth='19' strokeLinecap='round' strokeLinejoin='round'/>
      <path d='M190 209 L238 252 L286 296' fill='none' stroke={leggings} strokeWidth='18' strokeLinecap='round' strokeLinejoin='round'/>
      <path d='M123 294 L124 307 L105 310 Q98 309 104 305 L116 299 L118 294Z M281 296 L286 307 L306 309 Q312 308 307 305 L293 299 L290 294Z' fill={skin}/>
      <path d='M165 146 L120 144 L75 143 M195 146 L240 143 L282 143' fill='none' stroke={skin} strokeWidth='9' strokeLinecap='round' strokeLinejoin='round'/>
      <path d='M76 143 L64 140 M76 144 L64 145 M281 143 L295 140 M281 144 L294 146' fill='none' stroke={skin} strokeWidth='4' strokeLinecap='round'/>
      <path d='M165 137 Q180 131 194 137 L198 162 Q190 181 199 210 Q181 217 161 209 Q169 183 161 162Z' fill={clothing}/>
      <path d='M168 140 Q180 146 191 140 M167 204 Q179 208 193 205' fill='none' stroke='#8b8b8b' strokeWidth='1'/>
      <Head x={180} y={109} tilt={-9}/>
    </g>
  );
}

function Dancer() {
  return (
    <g className='yoga-person'>
      <path d='M175 210 L164 256 L160 299' fill='none' stroke={clothing} strokeWidth='18' strokeLinecap='round' strokeLinejoin='round'/>
      <path d='M187 208 L225 230 L252 173' fill='none' stroke={leggings} strokeWidth='17' strokeLinecap='round' strokeLinejoin='round'/>
      <path d='M158 296 L158 307 L175 309 Q181 312 173 313 L150 313 Q146 312 149 308 L152 297Z' fill={skin}/>
      <path d='M252 176 L257 165 L254 155 Q252 151 249 156 L247 169' fill='none' stroke={skin} strokeWidth='7' strokeLinecap='round' strokeLinejoin='round'/>
      <path d='M163 147 L126 155 L86 139 M185 152 L219 166 L248 164' fill='none' stroke={skin} strokeWidth='9' strokeLinecap='round' strokeLinejoin='round'/>
      <path d='M87 139 L74 132 M86 141 L74 138 M247 165 Q251 159 256 162' fill='none' stroke={skin} strokeWidth='4' strokeLinecap='round'/>
      <path d='M160 137 Q175 137 188 149 Q191 169 197 188 L196 210 Q181 217 166 210 Q176 188 163 166Z' fill={clothing}/>
      <path d='M164 140 Q173 149 184 150 M171 204 Q181 209 191 205' fill='none' stroke='#8b8b8b' strokeWidth='1'/>
      <Head x={151} y={112} tilt={-19}/>
    </g>
  );
}

/** Original editable SVG artwork. Keep all four poses in this shared visual language. */
export function YogaIllustration({pose, decorative = false, className = ''}: {pose: YogaPose; decorative?: boolean; className?: string}) {
  const titleId = `yoga-${useId().replace(/:/g, '')}`;
  return (
    <svg data-yoga-pose={pose} className={`yoga-figure yoga-figure-${pose} ${className}`.trim()} viewBox='0 0 360 360' fill='none' xmlns='http://www.w3.org/2000/svg' role={decorative ? undefined : 'img'} aria-labelledby={decorative ? undefined : titleId} aria-hidden={decorative ? true : undefined} focusable='false'>
      {!decorative && <title id={titleId}>{poseLabels[pose]}</title>}
      <g aria-hidden='true'>
        <circle cx='180' cy='178' r='124' stroke='#e7e7e7' strokeWidth='1'/>
        <path d='M56 178 H66 M294 178 H304 M180 54 V64' stroke='#d6d6d6' strokeWidth='1'/>
        <path d='M81 315 H279' stroke='#c3c3c3' strokeWidth='1'/>
        <path d='M107 322 H253' stroke='#e7e7e7' strokeWidth='1'/>
      </g>
      {pose === 'seated' && <Seated/>}
      {pose === 'tree' && <Tree/>}
      {pose === 'warrior' && <Warrior/>}
      {pose === 'dancer' && <Dancer/>}
    </svg>
  );
}
