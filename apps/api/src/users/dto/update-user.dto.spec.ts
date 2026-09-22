import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LearningStyle } from '@aida/shared';
import { UpdateUserDto } from './update-user.dto';

describe('UpdateUserDto', () => {
  it('should accept empty string for displayName and transform to null', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      displayName: '',
      learningStyle: LearningStyle.FORMULAS,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.displayName).toBeNull();
  });

  it('should accept whitespace string for displayName and transform to null', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      displayName: '    ',
      learningStyle: LearningStyle.DIAGRAMS,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.displayName).toBeNull();
  });

  it('should accept null for displayName', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      displayName: null,
      learningStyle: LearningStyle.ANALOGIES,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.displayName).toBeNull();
  });

  it('should accept undefined for displayName when updating only learningStyle', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      learningStyle: LearningStyle.STORIES,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.displayName).toBeUndefined();
  });

  it('should validate and trim a valid displayName', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      displayName: '  Alex Smith  ',
      learningStyle: LearningStyle.AUDIO,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.displayName).toBe('Alex Smith');
  });

  it('should reject a displayName exceeding 100 characters', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      displayName: 'a'.repeat(101),
      learningStyle: LearningStyle.FORMULAS,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('displayName');
  });
});
