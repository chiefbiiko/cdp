import { basename, decode, existsSync, join, parse } from "./deps.ts";

const NEW_LINE_REGEX: RegExp = /\r?\n/;
const GIT_CONFIG_USER_SECTION_PATTERN: RegExp = /\[user\]/i;

function gitAuthorEmail(configFile: string): {
  author: undefined | string;
  email: undefined | string;
} {
  if (!existsSync(configFile)) {
    return { author: undefined, email: undefined };
  }

  const fileContents: string = decode(Deno.readFileSync(configFile));

  if (!GIT_CONFIG_USER_SECTION_PATTERN.test(fileContents)) {
    return { author: undefined, email: undefined };
  }

  const lines: string[] = fileContents
    .split(NEW_LINE_REGEX)
    .map((line: string): string =>
      GIT_CONFIG_USER_SECTION_PATTERN.test(line)
        ? line.trim().toLowerCase()
        : line.trim()
    )
    .filter((line: string): boolean =>
      !!line && !line.startsWith("#") && !line.startsWith(";")
    );

  const head: number = lines.indexOf("[user]") + 1;

  const tail: number = lines
    .slice(head)
    .reduce(
      (acc: number, line: string, i: number): number =>
        line.startsWith("[") && acc === Infinity ? i : acc,
      Infinity,
    );

  const userLines: string[] = lines.slice(head, tail);

  const userSection: { [key: string]: string } = userLines
    .reduce(
      (acc: { [key: string]: string }, userLine: string): {
        [key: string]: string;
      } => {
        const [key, value]: string[] = userLine
          .split("=")
          .map((part: string): string => part.trim());

        acc[key.toLowerCase()] = value;

        return acc;
      },
      {},
    );

  return {
    author: userSection.name,
    email: userSection.email,
  };
}

const ENV: { [key: string]: string } = Deno.env.toObject();
const CWD: string = Deno.cwd();
const HOME: string = ENV.HOME || ENV.USERPROFILE || "/";

const localGitConfig: {
  author: undefined | string;
  email: undefined | string;
} = gitAuthorEmail(join(CWD, ".git", "config"));

const globalGitConfig: {
  author: undefined | string;
  email: undefined | string;
} = gitAuthorEmail(join(HOME, ".gitconfig"));

const argv: { [key: string]: any } = parse(Deno.args, {
  string: ["name", "author", "email"],
  boolean: ["version", "help", "async", "force"],
  alias: { help: "h", version: "v", force: "f" },
  default: {
    author: ENV.CARGO_NAME ||
      ENV.GIT_AUTHOR_NAME ||
      ENV.GIT_COMMITTER_NAME ||
      localGitConfig.author ||
      globalGitConfig.author ||
      ENV.USER ||
      ENV.USERNAME ||
      ENV.NAME ||
      "unknown",
    email: ENV.CARGO_EMAIL ||
      ENV.GIT_AUTHOR_EMAIL ||
      ENV.GIT_COMMITTER_EMAIL ||
      localGitConfig.email ||
      globalGitConfig.email ||
      ENV.EMAIL ||
      "unknown",
  },
});

const path: string = argv._[0] || Deno.cwd();

argv.name = argv.name ? argv.name : basename(path);

export const params: {
  name: string;
  author: string;
  email: string;
  path: string;
  version?: boolean;
  help?: boolean;
  async?: boolean;
  force?: boolean;
} = {
  name: argv.name,
  author: argv.author,
  email: argv.email,
  path,
  version: argv.version,
  help: argv.help,
  async: argv.async,
  force: argv.force,
};
