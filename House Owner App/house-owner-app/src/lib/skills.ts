import type { Skill } from '@/hooks/useSkills';

export function formatSkillLabel(skillName: string, skills: Skill[] = []) {
  const normalized = skillName.trim();
  const asCode = normalized.toUpperCase().replace(/\s+/g, '_');
  const match = skills.find(
    (s) =>
      s.code === asCode ||
      s.label.toLowerCase() === normalized.toLowerCase() ||
      s.code.toLowerCase() === normalized.toLowerCase(),
  );
  if (match) return match.label;
  return normalized
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
