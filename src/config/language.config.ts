export const languageConfig: Record<
  string,
  { image: string; run: string; ext: string }
> = {
  python: {
    image: 'python:3.11',
    run: 'python {entry}',
    ext: '.py',
  },

  javascript: {
    image: 'node:20',
    run: 'node {entry}',
    ext: '.js',
  },

  typescript: {
    image: 'codelearn-node',
    run: 'ts-node {entry}',
    ext: '.ts',
  },

  cpp: {
    image: 'gcc:12',
    run: 'g++ *.cpp -O2 -o main && ./main',
    ext: '.cpp',
  },

  java: {
    image: 'openjdk:17',
    run: 'javac *.java && java Main',
    ext: '.java',
  },

  php: {
    image: 'php:8.3-cli',
    run: 'php {entry}',
    ext: '.php',
  },

  ruby: {
    image: 'ruby:3.3',
    run: 'ruby {entry}',
    ext: '.rb',
  },
};