import type { MusicDirector } from './music';
export type MiamiExperiment = 'a' | 'b' | 'c' | 'd';
export class MiamiChoreography {
    readonly settings = { enabled: true, a: true, b: true, c: true, d: true, strength: 1 };
    readonly waves = new Float32Array(4).fill(-100); // age, strength, age, strength
    readonly sequence = new Float32Array([-100, 0, 0, 0]); // age, start distance, alternating side, strength
    readonly block = new Float32Array([-100, 0, 0, 0]);
    readonly gateway = new Float32Array([-100, 0, 0, 0]);
    readonly uniforms = new Float32Array(4);
    private readonly events = [this.sequence, this.block, this.gateway];
    readonly counts = { a: 0, b: 0, c: 0, d: 0 };
    energy = 0;
    state: 0 | 1 | 2 = 1;
    elapsed = 0;
    cpuMs = 0;
    analysisToWorldMs = 0;
    private stateAge = 0;
    private lowHold = 0;
    private riseHold = 0;
    private armed = false;
    private kick = 0;
    private snare = 0;
    private generation = -1;
    private lastA = -10;
    private lastB = -10;
    private lastC = -10;
    private lastD = -40;
    private forced = false;
    private waveIndex = 0;
    private distance = 0;
    forceTransition() { this.forced = true; }
    clear() { this.waves.fill(-100); this.sequence[0] = this.block[0] = this.gateway[0] = -100; this.forced = false; }
    tick(director: MusicDirector, dt: number, distance: number, active: boolean, visible: boolean) {
        dt = Math.min(.1, Math.max(0, dt));
        this.elapsed += dt;
        if (Math.abs(distance - this.distance) > 100)
            this.clear(); // Route lap or district jump: retire old world-space anchors.
        this.distance = distance;
        const s = director.signal;
        if (this.generation !== director.generation) {
            this.clear();
            this.generation = director.generation;
            this.kick = director.kickCount;
            this.snare = director.snareCount;
            this.energy = 0;
            this.state = 1;
            this.stateAge = 0;
            this.lowHold = this.riseHold = 0;
            this.armed = false;
        }
        const kick = director.kickCount !== this.kick, snare = director.snareCount !== this.snare;
        this.kick = director.kickCount;
        this.snare = director.snareCount;
        if (!visible || !this.settings.enabled) {
            this.clear();
            this.lowHold = this.riseHold = 0;
            this.armed = false;
            return;
        }
        this.stateAge += dt;
        this.energy += ((active ? s.energy : 0) - this.energy) * (1 - Math.exp(-dt / 5));
        if (this.stateAge > 8) {
            const next = this.state === 0 ? (this.energy > .26 ? 1 : 0) : this.state === 2 ? (this.energy < .43 ? 1 : 2) : this.energy < .16 ? 0 : this.energy > .58 ? 2 : 1;
            if (next !== this.state) {
                this.state = next as 0 | 1 | 2;
                this.stateAge = 0;
            }
        }
        for (let i = 0; i < 4; i += 2)
            if (this.waves[i] >= 0)
                this.waves[i] = this.waves[i] < 2.6 ? this.waves[i] + dt : -100;
        for (const event of this.events)
            if (event[0] >= 0)
                event[0] = event[0] < (event === this.gateway ? 11 : 4.5) ? event[0] + dt : -100;
        if (!this.settings.a)
            this.waves.fill(-100);
        if (!this.settings.b)
            this.sequence[0] = -100;
        if (!this.settings.c)
            this.block[0] = -100;
        if (!this.settings.d)
            this.gateway[0] = -100;
        const density = this.state === 0 ? .7 : this.state === 2 ? 1.2 : 1;
        const lowAttack = kick || (snare && s.bass > .45 && s.energy > .12);
        if (active && s.energy > .045) {
            if (this.settings.a && lowAttack && this.waves[this.waveIndex * 2] < 0 && this.elapsed - this.lastA > .7 / density) {
                const i = this.waveIndex * 2;
                this.waves[i] = 0;
                this.waves[i + 1] = Math.min(1, .55 + s.bass * .45);
                this.waveIndex = 1 - this.waveIndex;
                this.lastA = this.elapsed;
                this.counts.a++;
            }
            if (this.settings.b && (snare || kick) && this.elapsed - this.lastB > 3.2 / density) {
                this.sequence.set([0, distance, this.counts.b % 2, 1]);
                this.lastB = this.elapsed;
                this.counts.b++;
            }
            if (this.settings.c && (kick || snare) && this.elapsed - this.lastC > 8 / density && s.energy > .12) {
                this.block.set([0, distance, 0, 1]);
                this.lastC = this.elapsed;
                this.counts.c++;
            }
        }
        // A sustained quiet passage must precede the rise. Startup and station changes do not count as drops.
        if (active && s.energy < .22) {
            this.lowHold += dt;
            if (this.lowHold > 3)
                this.armed = true;
        }
        else
            this.lowHold = 0;
        this.riseHold = active && this.armed && s.energy > .5 && s.energy > this.energy + .18 ? this.riseHold + dt : 0;
        const significant = this.riseHold > .8 && s.bass > .3;
        if (this.settings.d && (this.forced || (significant && this.elapsed - this.lastD > 35))) {
            this.gateway.set([0, distance, 0, 1]);
            this.lastD = this.elapsed;
            this.counts.d++;
            this.armed = false;
            this.riseHold = 0;
        }
        this.forced = false;
    }
}
