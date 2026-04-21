import type { Sample } from '../../types/sample';

export class SampleHandler {
  private samples: Map<string, Sample> = new Map();

  createSample(id: string, stageId: string, payload: string): Sample {
    const sample: Sample = {
      id,
      stageId,
      payload,
      status: 'pending',
    };
    this.samples.set(id, sample);
    return sample;
  }

  approveSample(sampleId: string): Sample | undefined {
    const sample = this.samples.get(sampleId);
    if (sample) {
      sample.status = 'approved';
    }
    return sample;
  }

  rejectSample(sampleId: string): Sample | undefined {
    const sample = this.samples.get(sampleId);
    if (sample) {
      sample.status = 'rejected';
    }
    return sample;
  }

  getSample(sampleId: string): Sample | undefined {
    return this.samples.get(sampleId);
  }

  getSamplesByStage(stageId: string): Sample[] {
    return Array.from(this.samples.values()).filter(
      s => s.stageId === stageId
    );
  }
}