// cPanel startup file for Next.js standalone
process.chdir(__dirname);
process.env.PORT = process.env.PORT || 3000;
process.env.HOSTNAME = '0.0.0.0';

// Run the Next.js standalone server that was generated during build
require('./.next/standalone/server.js');
