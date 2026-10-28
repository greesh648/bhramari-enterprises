import runtime from '../dist/server/index.js';
import {createVercelHandler} from '../worker/vercel.mjs';

// Standard Web Request/Response entry point for Vercel's default Node.js runtime.
// Every exported page and API must pass through the existing server boundary.
export default createVercelHandler(runtime);
