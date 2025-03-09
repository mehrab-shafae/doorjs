import path from 'path';

export const cwd = (resolvePath?: string, join?: string): string => {
  const resolvedPath = path.resolve(process.cwd(), resolvePath || '');

  return join ? path.join(resolvedPath, join) : resolvedPath;
};
