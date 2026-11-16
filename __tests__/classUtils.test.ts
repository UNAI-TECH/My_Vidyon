import { getClassRank, compareClasses, compareSections, sortClasses, sortSections } from '../src/utils/classUtils';

describe('classUtils', () => {
  it('correctly ranks classes from Pre-KG to 12th Standard', () => {
    const rawNames = [
      '10th Standard',
      'Pre-KG',
      '12th Standard',
      '1st Standard',
      'LKG',
      '5th Standard',
      'UKG',
      '9th Standard',
      '2nd Standard',
      '11th Standard',
      '6th Standard',
      '8th Standard',
      '3rd Standard',
      '7th Standard',
      '4th Standard'
    ];

    const sorted = sortClasses(rawNames);

    expect(sorted).toEqual([
      'Pre-KG',
      'LKG',
      'UKG',
      '1st Standard',
      '2nd Standard',
      '3rd Standard',
      '4th Standard',
      '5th Standard',
      '6th Standard',
      '7th Standard',
      '8th Standard',
      '9th Standard',
      '10th Standard',
      '11th Standard',
      '12th Standard'
    ]);
  });

  it('correctly sorts class objects with sections', () => {
    const classes = [
      { name: '10th Standard', section: 'B' },
      { name: '1st Standard', section: 'A' },
      { name: '10th Standard', section: 'A' },
      { name: 'Pre-KG', section: 'C' },
      { name: 'Pre-KG', section: 'A' },
      { name: 'Pre-KG', section: 'B' },
    ];

    const sorted = sortClasses(classes);

    expect(sorted.map(c => `${c.name} - ${c.section}`)).toEqual([
      'Pre-KG - A',
      'Pre-KG - B',
      'Pre-KG - C',
      '1st Standard - A',
      '10th Standard - A',
      '10th Standard - B',
    ]);
  });

  it('sorts sections alphabetically', () => {
    expect(sortSections(['D', 'A', 'C', 'B'])).toEqual(['A', 'B', 'C', 'D']);
    expect(sortSections(['Section C', 'Section A', 'Section B'])).toEqual(['Section A', 'Section B', 'Section C']);
  });

  it('respects database stage and class_order when available', () => {
    const classA = { name: 'Custom Alpha', stage: 'pre_primary', class_order: 1 };
    const classB = { name: 'Custom Beta', stage: 'secondary', class_order: 2 };
    expect(compareClasses(classA, classB)).toBeLessThan(0);
  });
});
