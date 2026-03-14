export const languageConfig: Record<
  string,
  { image: string; run: string; entry?: string }
> = {
  python: {
    image: 'python:3.11',
    run: 'python main.py',
    entry: 'main.py',
  },

  javascript: {
    image: 'node:20',
    run: 'node index.js',
  },

  typescript: {
    image: 'node:20',
    run: 'npx ts-node index.ts',
  },

  cpp: {
    image: 'gcc:12',
    run: 'g++ *.cpp -o main && ./main',
  },

  java: {
    image: 'openjdk:17',
    run: 'javac *.java && java Main',
  },

  csharp: {
    image: 'mcr.microsoft.com/dotnet/sdk:8.0',
    run: 'dotnet new console -n app && cp *.cs app/ && cd app && dotnet run',
  },

  go: {
    image: 'golang:1.22',
    run: 'go run .',
  },

  rust: {
    image: 'rust:1.75',
    run: 'rustc main.rs && ./main',
  },

  php: {
    image: 'php:8.3-cli',
    run: 'php index.php',
  },

  ruby: {
    image: 'ruby:3.3',
    run: 'ruby main.rb',
  },

  sql: {
    image: 'postgres:16',
    run: 'psql -U postgres -f query.sql',
  },
};