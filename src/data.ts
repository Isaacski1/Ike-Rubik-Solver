
export interface Algorithm {
  id: string;
  name: string;
  moves: string[];
  category: 'Basic' | 'OLL' | 'PLL' | 'Advanced';
  description: string;
}

export const ALGORITHMS: Algorithm[] = [
  {
    id: 'sune',
    name: 'Sune',
    moves: ["R", "U", "R'", "U", "R", "U2", "R'"],
    category: 'Basic',
    description: 'Rotates three top corners while preserving the cross. Essential for beginner and CFOP methods.'
  },
  {
    id: 'antisune',
    name: 'Anti-Sune',
    moves: ["R", "U2", "R'", "U'", "R", "U'", "R'"],
    category: 'Basic',
    description: 'The mirror of Sune. Use this when the top corner orientation is reversed.'
  },
  {
    id: 't-perm',
    name: 'T-Permutation',
    moves: ["R", "U", "R'", "U'", "R'", "F", "R2", "U'", "R'", "U'", "R", "U", "R'", "F'"],
    category: 'PLL',
    description: 'Swaps two corners and two edges. One of the most famous and satisfying algorithms to execute.'
  },
  {
    id: 'j-perm',
    name: 'J-Permutation (B)',
    moves: ["R", "U", "R'", "F'", "R", "U", "R'", "U'", "R'", "F", "R2", "U'", "R'"],
    category: 'PLL',
    description: 'Swaps two corners and two edges on the right side. Great for fast PLL execution.'
  },
  {
    id: 'sexy-move',
    name: 'The "Sexy" Move',
    moves: ["R", "U", "R'", "U'"],
    category: 'Basic',
    description: 'A fundamental 4-move sequence used in hundreds of more complex algorithms.'
  },
  {
    id: 'y-perm',
    name: 'Y-Permutation',
    moves: ["F", "R", "U'", "R'", "U'", "R", "U", "R'", "F'", "R", "U", "R'", "U'", "R'", "F", "R", "F'"],
    category: 'PLL',
    description: 'Swaps corners diagonally. Essential for the final layer of your solve.'
  }
];

export interface Achievement {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  icon: string;
  condition: (stats: any) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_solve',
    title: 'First Light',
    description: 'Complete your very first cube solve.',
    xpReward: 100,
    icon: 'Sparkles',
    condition: (stats) => stats.totalSolves >= 1
  },
  {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Solve the cube in under 60 seconds.',
    xpReward: 500,
    icon: 'Zap',
    condition: (stats) => stats.bestTime !== null && stats.bestTime < 60
  },
  {
    id: 'consistent',
    title: 'Consistent Solver',
    description: 'Complete 10 total solves.',
    xpReward: 250,
    icon: 'Target',
    condition: (stats) => stats.totalSolves >= 10
  }
];

export interface Skin {
  id: string;
  name: string;
  description: string;
  cost: number;
  styles: {
    U: string;
    R: string;
    F: string;
    D: string;
    L: string;
    B: string;
    empty: string;
    texture?: string;
  };
}

export const SKINS: Skin[] = [
  {
    id: 'classic',
    name: 'Classic Plastic',
    description: 'The original stickerless look with vibrant matte finish.',
    cost: 0,
    styles: {
      U: '#ffffff',
      R: '#ef4444',
      F: '#22c55e',
      D: '#facc15',
      L: '#f97316',
      B: '#2563eb',
      empty: '#94a3b8'
    }
  },
  {
    id: 'neon',
    name: 'Translucent Neon',
    description: 'Glow-in-the-dark colors with a high-gloss finish.',
    cost: 500,
    styles: {
      U: '#e0f2fe',
      R: '#fb7185',
      F: '#4ade80',
      D: '#fde047',
      L: '#fb923c',
      B: '#60a5fa',
      empty: '#334155'
    }
  },
  {
    id: 'carbon',
    name: 'Carbon Fiber',
    description: 'Sleek black edges with metallic-reflective faces.',
    cost: 1500,
    styles: {
      U: '#94a3b8',
      R: '#b91c1c',
      F: '#15803d',
      D: '#a16207',
      L: '#c2410c',
      B: '#1d4ed8',
      empty: '#0f172a'
    }
  }
];

export interface Pattern {
  id: string;
  name: string;
  description: string;
  moves: string[];
}

export const PATTERNS: Pattern[] = [
  {
    id: 'checkerboard',
    name: 'Checkerboard',
    description: 'The most famous pattern, creating an alternating color grid on all six faces.',
    moves: ["M2", "E2", "S2"]
  },
  {
    id: 'cube_in_cube',
    name: 'Cube in a Cube',
    description: 'A striking optical illusion where a smaller 2x2 cube appears inside the 3x3.',
    moves: ["F", "L", "F", "U'", "R", "U", "F2", "L2", "U'", "L'", "B", "D'", "B'", "L2", "U"]
  },
  {
    id: 'anaconda',
    name: 'Anaconda',
    description: 'A winding path of color that twists around the entire cube like a snake.',
    moves: ["L", "U", "B'", "U'", "R", "L'", "B", "R'", "F", "B'", "D", "R", "L'", "F'"]
  },
  {
    id: 'python',
    name: 'Python',
    description: 'A variant of the snake pattern with more complex, intersecting paths.',
    moves: ["F2", "R2", "B2", "U2", "L2", "F2", "R2", "D2"]
  },
  {
    id: 'flower',
    name: 'Flower / Dots',
    description: 'Swaps the center pieces of all faces, creating a "dot" or "flower" effect.',
    moves: ["M", "E", "M'", "E'"]
  }
];

export interface Personality {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon: string;
}

export const PERSONALITIES: Personality[] = [
  {
    id: 'coach',
    name: 'Pro Coach',
    description: 'Direct, efficient, and technical advice for serious improvements.',
    prompt: 'You are a professional speed-cube world record holder coaching a student. Be brief, technical, and precise.',
    icon: 'Brain'
  },
  {
    id: 'hypeman',
    name: 'The Hype-Man',
    description: 'Explosive energy and constant encouragement for every single turn.',
    prompt: 'You are a high-energy hype-man commentating on a cube solve. Be extremely enthusiastic, use lots of exclamation marks, and keep instructions very simple.',
    icon: 'Zap'
  },
  {
    id: 'strict',
    name: 'Strict Sensei',
    description: 'No-nonsense guidance that demands focus and discipline.',
    prompt: 'You are a strict martial arts master teaching cube solving. Be disciplined, slightly stern, and focus on the philosophy of movement.',
    icon: 'Shield'
  },
  {
    id: 'zen',
    name: 'Zen Master',
    description: 'Calm, peaceful, and poetic explanations to keep your mind clear.',
    prompt: 'You are a calm zen master. Explain the moves as if they are a flowing river or wind. Be very peaceful and poetic.',
    icon: 'Moon'
  }
];
