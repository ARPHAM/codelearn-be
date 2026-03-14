export const languageConfig: Record<
  string,
  { image: string; run: string }
> = {
  python: {
    image: 'python:3.11',
    run: 'python {entry}',
  },

  javascript: {
    image: 'node:20',
    run: 'node {entry}',
  },

  typescript: {
    image: 'node:20',
    run: 'npx ts-node {entry}',
  },

  cpp: {
    image: 'gcc:12',
    run: 'g++ *.cpp -O2 -o main && ./main',
  },

  java: {
    image: 'openjdk:17',
    run: 'javac *.java && java Main',
  },

  php: {
    image: 'php:8.3-cli',
    run: 'php {entry}',
  },

  ruby: {
    image: 'ruby:3.3',
    run: 'ruby {entry}',
  },
};