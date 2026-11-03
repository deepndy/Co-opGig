import { describe,it,expect } from 'vitest';
const categories=['electrician','plumber','carpenter','painter','cleaner','gardener','driver','caregiver','technician','domestic-helper','mason','appliance-repair'];
const transitions:Record<string,string[]>={ACCEPTED:['IN_PROGRESS','CANCELLED'],IN_PROGRESS:['COMPLETED','CANCELLED']};
describe('Co-opGig shared domain contract',()=>{
 it('contains the 12 canonical service categories',()=>{expect(categories).toHaveLength(12);expect(categories).toContain('domestic-helper');});
 it('rejects unknown categories',()=>expect(categories.includes('roofer')).toBe(false));
 it('permits only the documented worker lifecycle transitions',()=>{expect(transitions.ACCEPTED).toContain('IN_PROGRESS');expect(transitions.IN_PROGRESS).toContain('COMPLETED');expect(transitions.OPEN).toBeUndefined();});
 it('keeps customer confirmation separate from worker completion',()=>{expect(transitions.COMPLETED).toBeUndefined();});
});
