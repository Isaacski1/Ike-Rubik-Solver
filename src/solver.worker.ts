import Cube from 'cubejs';

Cube.initSolver();

self.onmessage = (e) => {
  const { cubeStr } = e.data;
  try {
    const cube = Cube.fromString(cubeStr);
    
    // Validate the parsed cube to prevent infinite loops in the solver
    const cp = new Set(cube.cp);
    if (cp.size !== 8) throw new Error('Invalid corners: Duplicate or missing corners.');
    
    const ep = new Set(cube.ep);
    if (ep.size !== 12) throw new Error('Invalid edges: Duplicate or missing edges.');
    
    if (cube.cornerParity() !== cube.edgeParity()) {
      throw new Error('Invalid parity: Two pieces need to be swapped.');
    }
    
    let twist = 0;
    for (let i = 0; i < 8; i++) twist += cube.co[i];
    if (twist % 3 !== 0) {
      throw new Error('Invalid corner twist: A corner is twisted incorrectly.');
    }
    
    let flip = 0;
    for (let i = 0; i < 12; i++) flip += cube.eo[i];
    if (flip % 2 !== 0) {
      throw new Error('Invalid edge flip: An edge is flipped incorrectly.');
    }

    const solveStr = cube.solve();
    self.postMessage({ success: true, solveStr, isSolved: cube.isSolved() });
  } catch (error) {
    self.postMessage({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Invalid cube configuration' 
    });
  }
};
