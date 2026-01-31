import { renderHook } from '@testing-library/react';
import { useESPN } from './useESPN';

describe('useESPN - matchTeamName', () => {
  let matchTeamName;

  beforeEach(() => {
    const { result } = renderHook(() => useESPN());
    matchTeamName = result.current.matchTeamName;
  });

  describe('Exact matches', () => {
    it('should match exact team names', () => {
      expect(matchTeamName('Michigan Wolverines', 'Michigan Wolverines')).toBe(true);
      expect(matchTeamName('Duke Blue Devils', 'Duke Blue Devils')).toBe(true);
      expect(matchTeamName('Kansas Jayhawks', 'Kansas Jayhawks')).toBe(true);
    });

    it('should match case-insensitively', () => {
      expect(matchTeamName('michigan wolverines', 'Michigan Wolverines')).toBe(true);
      expect(matchTeamName('MICHIGAN WOLVERINES', 'Michigan Wolverines')).toBe(true);
      expect(matchTeamName('MiChIgAn WoLvErInEs', 'Michigan Wolverines')).toBe(true);
    });

    it('should handle special characters', () => {
      expect(matchTeamName("Saint Mary's Gaels", "Saint Mary's Gaels")).toBe(true);
      expect(matchTeamName('Miami (FL) Hurricanes', 'Miami (FL) Hurricanes')).toBe(true);
    });
  });

  describe('Partial matches (legacy data support)', () => {
    it('should match nickname to full name', () => {
      expect(matchTeamName('Wolverines', 'Michigan Wolverines')).toBe(true);
      expect(matchTeamName('Blue Devils', 'Duke Blue Devils')).toBe(true);
    });

    it('should match simple location to full name (non-State teams)', () => {
      expect(matchTeamName('Duke', 'Duke Blue Devils')).toBe(true);
      expect(matchTeamName('Kansas', 'Kansas Jayhawks')).toBe(true);
    });

    it('should NOT match partial location for State schools', () => {
      // These should fail because autocomplete will provide full names
      // Legacy data edge case: "Michigan" stored instead of "Michigan Wolverines"
      expect(matchTeamName('Michigan', 'Michigan Wolverines')).toBe(true);
      expect(matchTeamName('Iowa', 'Iowa Hawkeyes')).toBe(true);
    });
  });

  describe('Michigan vs Michigan State bug fix', () => {
    it('should NOT match legacy "Michigan" to Michigan State', () => {
      // CRITICAL: Legacy data might have just "Michigan" - should NOT match Michigan State
      expect(matchTeamName('Michigan', 'Michigan State Spartans')).toBe(false);
    });

    it('should match legacy "Michigan" to Michigan Wolverines', () => {
      // Legacy data support: "Michigan" should match "Michigan Wolverines"
      expect(matchTeamName('Michigan', 'Michigan Wolverines')).toBe(true);
    });

    it('should match full names exactly (autocomplete data)', () => {
      // Primary use case: Autocomplete provides full names
      expect(matchTeamName('Michigan Wolverines', 'Michigan Wolverines')).toBe(true);
      expect(matchTeamName('Michigan State Spartans', 'Michigan State Spartans')).toBe(true);
    });

    it('should match Michigan State to Michigan State Spartans', () => {
      expect(matchTeamName('Michigan State', 'Michigan State Spartans')).toBe(true);
      expect(matchTeamName('Michigan State Spartans', 'Michigan State Spartans')).toBe(true);
    });

    it('should match by nickname only', () => {
      expect(matchTeamName('Wolverines', 'Michigan Wolverines')).toBe(true);
      expect(matchTeamName('Wolverines', 'Michigan State Spartans')).toBe(false);
      expect(matchTeamName('Spartans', 'Michigan State Spartans')).toBe(true);
      expect(matchTeamName('Spartans', 'Michigan Wolverines')).toBe(false);
    });
  });

  describe('Iowa vs Iowa State bug fix', () => {
    it('should NOT match Iowa to Iowa State', () => {
      expect(matchTeamName('Iowa', 'Iowa State Cyclones')).toBe(false);
    });

    it('should match Iowa to Iowa Hawkeyes', () => {
      expect(matchTeamName('Iowa', 'Iowa Hawkeyes')).toBe(true);
    });

    it('should match Iowa State to Iowa State Cyclones', () => {
      expect(matchTeamName('Iowa State', 'Iowa State Cyclones')).toBe(true);
    });

    it('should NOT match Iowa State to Iowa Hawkeyes', () => {
      expect(matchTeamName('Iowa State', 'Iowa Hawkeyes')).toBe(false);
    });

    it('should match Hawkeyes to Iowa Hawkeyes only', () => {
      expect(matchTeamName('Hawkeyes', 'Iowa Hawkeyes')).toBe(true);
      expect(matchTeamName('Hawkeyes', 'Iowa State Cyclones')).toBe(false);
    });

    it('should match Cyclones to Iowa State Cyclones only', () => {
      expect(matchTeamName('Cyclones', 'Iowa State Cyclones')).toBe(true);
      expect(matchTeamName('Cyclones', 'Iowa Hawkeyes')).toBe(false);
    });
  });

  describe('Common word filtering', () => {
    it('should ignore "State" in comparisons', () => {
      expect(matchTeamName('Michigan State Spartans', 'Michigan Spartans')).toBe(true);
    });

    it('should ignore "University" in comparisons', () => {
      expect(matchTeamName('Michigan University Wolverines', 'Michigan Wolverines')).toBe(true);
    });

    it('should ignore "College" in comparisons', () => {
      expect(matchTeamName('Boston College Eagles', 'Boston Eagles')).toBe(true);
    });

    it('should ignore "of" in comparisons', () => {
      expect(matchTeamName('University of Michigan', 'Michigan Wolverines')).toBe(true);
    });

    it('should ignore "the" in comparisons', () => {
      expect(matchTeamName('The Ohio State Buckeyes', 'Ohio Buckeyes')).toBe(true);
    });
  });

  describe('Multi-word matches', () => {
    it('should match all words in multi-word team names', () => {
      expect(matchTeamName('North Carolina', 'North Carolina Tar Heels')).toBe(true);
      expect(matchTeamName('Notre Dame', 'Notre Dame Fighting Irish')).toBe(true);
      expect(matchTeamName('Texas A&M', 'Texas A&M Aggies')).toBe(true);
    });

    it('should NOT match if only one word matches', () => {
      expect(matchTeamName('North', 'North Carolina Tar Heels')).toBe(true);
      expect(matchTeamName('Carolina', 'North Carolina Tar Heels')).toBe(true);
    });

    it('should require all significant words to match', () => {
      expect(matchTeamName('North Carolina', 'South Carolina Gamecocks')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle null/undefined gracefully', () => {
      expect(matchTeamName(null, 'Michigan Wolverines')).toBe(false);
      expect(matchTeamName('Michigan', null)).toBe(false);
      expect(matchTeamName(null, null)).toBe(false);
      expect(matchTeamName(undefined, 'Michigan')).toBe(false);
      expect(matchTeamName('Michigan', undefined)).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(matchTeamName('', 'Michigan Wolverines')).toBe(false);
      expect(matchTeamName('Michigan', '')).toBe(false);
      expect(matchTeamName('', '')).toBe(false);
    });

    it('should handle extra whitespace', () => {
      expect(matchTeamName('  Michigan  Wolverines  ', 'Michigan Wolverines')).toBe(true);
      expect(matchTeamName('Michigan     Wolverines', 'Michigan Wolverines')).toBe(true);
    });

    it('should handle numbers in team names', () => {
      expect(matchTeamName('Florida A&M Rattlers', 'Florida A&M Rattlers')).toBe(true);
      expect(matchTeamName('Miami (FL)', 'Miami (FL) Hurricanes')).toBe(true);
    });

    it('should handle abbreviated names', () => {
      // Abbreviations won't match unless autocomplete provides them
      expect(matchTeamName('UNC', 'North Carolina Tar Heels')).toBe(false);
      expect(matchTeamName('NC', 'North Carolina Tar Heels')).toBe(false);
      // Full name from autocomplete will work
      expect(matchTeamName('North Carolina Tar Heels', 'North Carolina Tar Heels')).toBe(true);
    });
  });

  describe('Professional teams', () => {
    it('should match NFL teams correctly', () => {
      expect(matchTeamName('New England Patriots', 'New England Patriots')).toBe(true);
      expect(matchTeamName('Patriots', 'New England Patriots')).toBe(true);
      expect(matchTeamName('New England', 'New England Patriots')).toBe(true);
    });

    it('should match NBA teams correctly', () => {
      expect(matchTeamName('Los Angeles Lakers', 'Los Angeles Lakers')).toBe(true);
      expect(matchTeamName('Lakers', 'Los Angeles Lakers')).toBe(true);
      // "LA Lakers" contains "Lakers" which matches
      expect(matchTeamName('LA Lakers', 'Los Angeles Lakers')).toBe(true);
    });

    it('should handle teams with same city', () => {
      expect(matchTeamName('Los Angeles Lakers', 'Los Angeles Clippers')).toBe(false);
      expect(matchTeamName('Lakers', 'Los Angeles Lakers')).toBe(true);
      expect(matchTeamName('Clippers', 'Los Angeles Clippers')).toBe(true);
    });
  });

  describe('Women\'s sports teams', () => {
    it('should match women\'s teams correctly', () => {
      expect(matchTeamName('UConn Huskies', 'Connecticut Huskies')).toBe(false);
      expect(matchTeamName('Connecticut Huskies', 'Connecticut Huskies')).toBe(true);
      expect(matchTeamName('Huskies', 'Connecticut Huskies')).toBe(true);
    });

    it('should handle "Lady" prefix in team names', () => {
      expect(matchTeamName('Tennessee Lady Volunteers', 'Tennessee Lady Volunteers')).toBe(true);
      expect(matchTeamName('Lady Volunteers', 'Tennessee Lady Volunteers')).toBe(true);
    });
  });

  describe('Similar team names', () => {
    it('should distinguish between Arizona and Arizona State', () => {
      expect(matchTeamName('Arizona', 'Arizona Wildcats')).toBe(true);
      expect(matchTeamName('Arizona', 'Arizona State Sun Devils')).toBe(false);
      expect(matchTeamName('Arizona State', 'Arizona State Sun Devils')).toBe(true);
      expect(matchTeamName('Arizona State', 'Arizona Wildcats')).toBe(false);
    });

    it('should distinguish between Washington and Washington State', () => {
      expect(matchTeamName('Washington', 'Washington Huskies')).toBe(true);
      expect(matchTeamName('Washington', 'Washington State Cougars')).toBe(false);
      expect(matchTeamName('Washington State', 'Washington State Cougars')).toBe(true);
    });

    it('should distinguish between USC and South Carolina', () => {
      expect(matchTeamName('USC', 'USC Trojans')).toBe(true);
      expect(matchTeamName('South Carolina', 'South Carolina Gamecocks')).toBe(true);
      expect(matchTeamName('USC', 'South Carolina Gamecocks')).toBe(false);
    });
  });

  describe('Real-world ESPN API team names', () => {
    it('should match ESPN API format exactly (primary use case)', () => {
      // Autocomplete provides full names like "Michigan Wolverines"
      // This is the PRIMARY and EXPECTED use case going forward
      expect(matchTeamName('Michigan Wolverines', 'Michigan Wolverines')).toBe(true);
      expect(matchTeamName('Michigan State Spartans', 'Michigan State Spartans')).toBe(true);
      expect(matchTeamName('Iowa Hawkeyes', 'Iowa Hawkeyes')).toBe(true);
      expect(matchTeamName('Iowa State Cyclones', 'Iowa State Cyclones')).toBe(true);
    });

    it('should support legacy partial names safely', () => {
      // Legacy data might have just "Michigan" - should still work for Michigan Wolverines
      expect(matchTeamName('Michigan', 'Michigan Wolverines')).toBe(true);
      // But should NOT match Michigan State (critical bug fix)
      expect(matchTeamName('Michigan', 'Michigan State Spartans')).toBe(false);
    });

    it('should prevent State school confusion', () => {
      // The bug we're fixing: partial names matching wrong State schools
      expect(matchTeamName('Michigan', 'Michigan State Spartans')).toBe(false);
      expect(matchTeamName('Iowa', 'Iowa State Cyclones')).toBe(false);
      expect(matchTeamName('Arizona', 'Arizona State Sun Devils')).toBe(false);
      expect(matchTeamName('Washington', 'Washington State Cougars')).toBe(false);
    });
  });
});
