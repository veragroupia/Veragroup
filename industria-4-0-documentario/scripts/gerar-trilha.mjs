// Trilha sonora e efeitos ORIGINAIS, sintetizados por este script (sem amostras de terceiros).
// Gera: public/audio/musica/trilha-0N.mp3 (um bloco por capítulo + créditos) e public/audio/efeitos/*.wav
// Uso: node scripts/gerar-trilha.mjs     (requer ffmpeg no PATH para gravar MP3)
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const raiz = fileURLToPath(new URL('../public/audio/', import.meta.url));
mkdirSync(raiz + 'musica', { recursive: true });
mkdirSync(raiz + 'efeitos', { recursive: true });

// ---------- utilidades ----------
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
let semente = 12345;
const rand = () => ((semente = (semente * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

function wav(caminho, L, R = L) {
	const n = L.length;
	const buf = Buffer.alloc(44 + n * 4);
	buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
	buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
	buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
	for (let i = 0; i < n; i++) {
		buf.writeInt16LE(Math.max(-1, Math.min(1, L[i])) * 32767, 44 + i * 4);
		buf.writeInt16LE(Math.max(-1, Math.min(1, R[i])) * 32767, 46 + i * 4);
	}
	writeFileSync(caminho, buf);
}

// filtro passa-baixa de 1 polo (suaviza) e reverberação simples (Schroeder: 4 combs + 2 all-pass)
const passaBaixa = (x, corte) => { const a = Math.exp((-2 * Math.PI * corte) / SR); let y = 0; return x.map((v) => (y = (1 - a) * v + a * y)); };
function reverb(x, mistura = 0.35, tempo = 0.84, desloc = 0) {
	const combs = [1557, 1617, 1491, 1422].map((d) => d + desloc);
	const out = new Float32Array(x.length);
	for (const d of combs) {
		const b = new Float32Array(d); let i = 0; let lp = 0;
		for (let n = 0; n < x.length; n++) { const y = b[i]; lp = y * 0.8 + lp * 0.2; b[i] = x[n] + lp * tempo; out[n] += y / combs.length; i = (i + 1) % d; }
	}
	for (const d of [225, 556]) {
		const b = new Float32Array(d); let i = 0;
		for (let n = 0; n < out.length; n++) { const v = b[i]; const y = -out[n] + v; b[i] = out[n] + v * 0.5; out[n] = y; i = (i + 1) % d; }
	}
	return x.map((v, n) => v * (1 - mistura) + out[n] * mistura * 1.6);
}

// ---------- trilha ----------
// Cada bloco: progressão de acordes (MIDI), andamento, densidade do arpejo e brilho.
const BLOCOS = {
	'01': { acordes: [[50, 57, 62, 64, 69], [46, 53, 58, 62, 65], [41, 48, 57, 60, 65], [48, 55, 60, 64, 67]], bpm: 92, arpejo: 0.45, brilho: 1800, pulso: 0.0, seg: 8 },
	'02': { acordes: [[50, 57, 62, 65, 69], [46, 53, 58, 62, 65], [43, 50, 58, 62, 67], [45, 52, 57, 61, 64]], bpm: 100, arpejo: 0.75, brilho: 2600, pulso: 0.35, seg: 7.2 },
	'03': { acordes: [[41, 48, 57, 60, 64], [48, 55, 60, 64, 67], [50, 57, 60, 65, 69], [46, 53, 58, 62, 69]], bpm: 100, arpejo: 0.8, brilho: 3000, pulso: 0.45, seg: 7.2 },
	'04': { acordes: [[38, 45, 50, 53, 57], [34, 41, 50, 53, 58], [31, 43, 50, 55, 58], [33, 45, 52, 57, 61]], bpm: 84, arpejo: 0.3, brilho: 1200, pulso: 0.15, seg: 9 },
	'05': { acordes: [[46, 53, 58, 62, 65], [41, 48, 57, 60, 65], [48, 55, 60, 64, 67], [50, 57, 62, 65, 69]], bpm: 96, arpejo: 0.85, brilho: 3400, pulso: 0.3, seg: 7.5 },
	creditos: { acordes: [[46, 53, 58, 62, 65], [41, 48, 57, 60, 65], [48, 55, 60, 64, 67], [50, 57, 62, 65, 69]], bpm: 72, arpejo: 0.35, brilho: 2200, pulso: 0, seg: 9 },
};

function bloco(cfg, duracao = 96) {
	const n = Math.floor(duracao * SR);
	const pad = new Float32Array(n), arp = new Float32Array(n), grave = new Float32Array(n), pulso = new Float32Array(n);
	const ciclo = cfg.acordes.length * cfg.seg;
	for (let i = 0; i < n; i++) {
		const t = i / SR;
		const k = Math.floor((t % ciclo) / cfg.seg);
		const tc = (t % ciclo) % cfg.seg;
		const atual = cfg.acordes[k];
		const ant = cfg.acordes[(k + cfg.acordes.length - 1) % cfg.acordes.length];
		const x = Math.min(1, tc / 1.8); // troca de acorde lenta (sem ataque percussivo)
		let s = 0;
		atual.slice(1).forEach((m, j) => {
			const fA = hz(m), fB = hz(ant[j + 1]);
			for (const det of [-0.0025, 0.0025]) {
				s += (Math.sin(2 * Math.PI * fA * (1 + det) * t + j) * x + Math.sin(2 * Math.PI * fB * (1 + det) * t + j) * (1 - x)) * 0.5;
				s += (Math.sin(4 * Math.PI * fA * (1 + det) * t) * x) * 0.12;
			}
		});
		pad[i] = s * 0.05 * (0.85 + 0.15 * Math.sin(2 * Math.PI * 0.07 * t));
		const fG = hz(atual[0] - 12);
		grave[i] = Math.sin(2 * Math.PI * fG * t) * 0.16 * (0.8 + 0.2 * Math.sin(2 * Math.PI * 0.11 * t));
	}
	// arpejo de "dados": notas curtas, delicadas, que sobem e descem pelo acorde
	const passo = 60 / cfg.bpm / 2;
	const notas = Math.floor(duracao / passo);
	const padrao = [1, 2, 3, 4, 3, 2, 4, 3];
	for (let q = 0; q < notas; q++) {
		const t0 = q * passo;
		if (((q * 7919) % 100) / 100 > cfg.arpejo) continue;
		const k = Math.floor((t0 % ciclo) / cfg.seg);
		const m = cfg.acordes[k][padrao[q % padrao.length]] + 12;
		const f = hz(m);
		const i0 = Math.floor(t0 * SR);
		const len = Math.floor(0.9 * SR);
		const v = 0.05 * (q % 4 === 0 ? 1 : 0.7);
		for (let j = 0; j < len && i0 + j < n; j++) {
			const tt = j / SR;
			arp[i0 + j] += (Math.sin(2 * Math.PI * f * tt) + 0.3 * Math.sin(4 * Math.PI * f * tt)) * Math.exp(-tt * 6) * Math.min(1, tt * 400) * v;
		}
	}
	// pulso grave muito suave (sem batidas fortes)
	if (cfg.pulso > 0) {
		const beat = 60 / cfg.bpm;
		for (let b = 0; b * beat < duracao; b++) {
			const i0 = Math.floor(b * beat * SR);
			for (let j = 0; j < 0.35 * SR && i0 + j < n; j++) {
				const tt = j / SR;
				pulso[i0 + j] += Math.sin(2 * Math.PI * (52 + 30 * Math.exp(-tt * 30)) * tt) * Math.exp(-tt * 9) * 0.22 * cfg.pulso;
			}
		}
	}
	const arpF = passaBaixa(arp, cfg.brilho);
	const mixL = new Float32Array(n), mixR = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		const pan = Math.sin((2 * Math.PI * i) / SR / 9) * 0.35;
		mixL[i] = pad[i] + grave[i] + pulso[i] + arpF[i] * (1 - pan);
		mixR[i] = pad[i] + grave[i] + pulso[i] + arpF[i] * (1 + pan);
	}
	const L = reverb(passaBaixa(mixL, 7000), 0.4, 0.84, 0);
	const R = reverb(passaBaixa(mixR, 7000), 0.4, 0.84, 23);
	// laço sem emenda audível: aplica cross-fade entre o final e o início
	const xf = Math.floor(3 * SR);
	for (let i = 0; i < xf; i++) {
		const a = i / xf;
		L[i] = L[i] * a + L[n - xf + i] * (1 - a);
		R[i] = R[i] * a + R[n - xf + i] * (1 - a);
	}
	let peak = 0;
	for (let i = 0; i < n - xf; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
	const g = 0.7 / peak;
	return [L.slice(0, n - xf).map((v) => v * g), R.slice(0, n - xf).map((v) => v * g)];
}

for (const [id, cfg] of Object.entries(BLOCOS)) {
	const [L, R] = bloco(cfg);
	const tmp = `${raiz}musica/.tmp-${id}.wav`;
	wav(tmp, L, R);
	execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-codec:a', 'libmp3lame', '-b:a', '160k', `${raiz}musica/trilha-${id}.mp3`]);
	rmSync(tmp);
	console.log(`trilha-${id}.mp3`);
}

// ---------- efeitos ----------
const buf = (s) => new Float32Array(Math.floor(s * SR));
const efeitos = {
	// sopro de transição: ruído filtrado com varredura
	transicao: () => {
		const x = buf(1.6); let y1 = 0, y2 = 0;
		for (let i = 0; i < x.length; i++) {
			const t = i / SR; const env = Math.sin(Math.PI * Math.min(1, t / 1.6)) ** 2;
			const fc = 300 + 2600 * Math.sin(Math.PI * Math.min(1, t / 1.6));
			const a = Math.exp((-2 * Math.PI * fc) / SR);
			y1 = (1 - a) * rand() + a * y1; y2 = (1 - a) * y1 + a * y2;
			x[i] = (y1 - y2) * env * 2.2;
		}
		return reverb(x, 0.3);
	},
	// entrada de título: grave suave com cauda
	titulo: () => {
		const x = buf(2.6);
		for (let i = 0; i < x.length; i++) {
			const t = i / SR;
			x[i] = Math.sin(2 * Math.PI * (48 + 40 * Math.exp(-t * 8)) * t) * Math.exp(-t * 2.2) * 0.8 + Math.sin(2 * Math.PI * hz(74) * t) * Math.exp(-t * 3) * 0.08 * Math.min(1, t * 50);
		}
		return reverb(x, 0.35);
	},
	// marcador de linha do tempo: toque curto e limpo
	marcador: () => {
		const x = buf(0.8);
		for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = (Math.sin(2 * Math.PI * 1320 * t) * 0.5 + Math.sin(2 * Math.PI * 660 * t) * 0.3) * Math.exp(-t * 14) * Math.min(1, t * 800); }
		return reverb(x, 0.3);
	},
	// conexão de dados: dois "blips" ascendentes
	conexao: () => {
		const x = buf(0.7);
		for (let i = 0; i < x.length; i++) { const t = i / SR; const f = t < 0.09 ? 980 : 1470; const tt = t < 0.09 ? t : t - 0.09; x[i] = Math.sin(2 * Math.PI * f * tt) * Math.exp(-tt * 28) * Math.min(1, tt * 900) * 0.5; }
		return reverb(x, 0.3);
	},
	// alerta industrial discreto: dois tons
	alerta: () => {
		const x = buf(1.4);
		for (let i = 0; i < x.length; i++) {
			const t = i / SR; const k = Math.floor(t / 0.28); const tt = t - k * 0.28;
			const f = k % 2 ? 660 : 880; x[i] = k < 4 ? (Math.sin(2 * Math.PI * f * tt) + 0.25 * Math.sin(6 * Math.PI * f * tt)) * Math.min(1, tt * 200) * Math.exp(-tt * 9) * 0.4 : 0;
		}
		return reverb(x, 0.25);
	},
	// bloqueio: batida abafada + tom descendente
	bloqueio: () => {
		const x = buf(1.0);
		for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = Math.sin(2 * Math.PI * (420 - 200 * t) * t) * Math.exp(-t * 7) * 0.4 + Math.sin(2 * Math.PI * 70 * t) * Math.exp(-t * 18) * 0.6; }
		return reverb(x, 0.25);
	},
};
for (const [nome, fn] of Object.entries(efeitos)) {
	const x = fn();
	let peak = 0;
	for (const v of x) peak = Math.max(peak, Math.abs(v));
	const y = x.map((v) => (v / peak) * 0.8);
	wav(`${raiz}efeitos/${nome}.wav`, y, y);
	console.log(`${nome}.wav`);
}
