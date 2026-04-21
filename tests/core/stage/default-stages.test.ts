import { describe, it, expect } from 'bun:test';
import { getAllDefaultStages, getDefaultStageById, isDefaultStageId, resolveDefaultStageId } from '../../../src/core/stage/default-stages';

describe('default-stages', () => {
  describe('getAllDefaultStages', () => {
    it('should return 4 fs* default stages', () => {
      const stages = getAllDefaultStages();
      expect(stages).toHaveLength(4);
    });

    it('should include fs_exists stage', () => {
      const stages = getAllDefaultStages();
      const fsExists = stages.find(s => s.id === 'default:fs_exists');
      expect(fsExists).toBeDefined();
      expect(fsExists?.proof).toBe('fs_exists');
    });

    it('should include fs_not_exists stage', () => {
      const stages = getAllDefaultStages();
      const fsNotExists = stages.find(s => s.id === 'default:fs_not_exists');
      expect(fsNotExists).toBeDefined();
      expect(fsNotExists?.proof).toBe('fs_not_exists');
    });

    it('should include fs_content_match stage', () => {
      const stages = getAllDefaultStages();
      const fsContentMatch = stages.find(s => s.id === 'default:fs_content_match');
      expect(fsContentMatch).toBeDefined();
      expect(fsContentMatch?.proof).toBe('fs_content_match');
    });

    it('should include fs_parseable stage', () => {
      const stages = getAllDefaultStages();
      const fsParseable = stages.find(s => s.id === 'default:fs_parseable');
      expect(fsParseable).toBeDefined();
      expect(fsParseable?.proof).toBe('fs_parseable');
    });
  });

  describe('getDefaultStageById', () => {
    it('should return stage by id', () => {
      const stage = getDefaultStageById('default:fs_exists');
      expect(stage).toBeDefined();
      expect(stage?.name).toBe('File Exists Check');
    });

    it('should return undefined for unknown id', () => {
      const stage = getDefaultStageById('unknown');
      expect(stage).toBeUndefined();
    });
  });

  describe('isDefaultStageId', () => {
    it('should return true for default stage id', () => {
      expect(isDefaultStageId('default:fs_exists')).toBe(true);
    });

    it('should return false for non-default stage id', () => {
      expect(isDefaultStageId('my-custom-stage')).toBe(false);
    });
  });

  describe('resolveDefaultStageId', () => {
    it('should resolve proof id to default stage id', () => {
      expect(resolveDefaultStageId('fs_exists')).toBe('default:fs_exists');
    });
  });
});