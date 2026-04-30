# Truncate Sarif Files

When SARIF files are really big (> 50mb) the problem is most commonly cause be including test, spec, and/or vendor folders in the scan. The first thing you should try is re-running the scanner with it's `--exclude` options set. or deleting those folders and rerunning the scan.

**But** when that still leaves you with a huge SARIF file, it's usually because the code snippets are gigantic and possibly numerous. This script solves that problem by truncating snippets to a max of 512 characters. If you can't fit a finding's code snippet into 2 Tweets, you've got bigger problems.

## Installation && Usage
```bash
git clone https://github.com/FWDSEC/truncate-sarif.git
cd truncate-sarif
npm i
node ./truncate-sarif.js /path/to/huge.sarif /path/to/truncated.sarif
```

You've now got yourself a much more manageable SARIF size that won't crash your IDE and can be uploaded to vulnerability management webapps like our beloved Ceviche.

## Common scanners and their exclusion options
### Opengrep/Semgrep
This will automatically exclude anything in `.gitignore`, so having an explicit exclude for `node_modules/` may be unnecessary but it can't hurt.
```bash
opengrep scan --sarif-output=opengrep.sarif --exclude='*test*' --exclude='*spec*' --exclude='node_modules' .
```

### Trufflehog
```bash
cat << EOF > exclude-patterns.txt
# Exclude vendor and test directories
^vendor/.*
.*_test\.go$
node_modules/.*
EOF
trufflehog filesystem --exclude-paths=exclude-patterns.txt
```

### Good old classic "delete 'em and let God sort 'em out"
```bash
find /path/to/repo -type d -iname "*test*" -exec rm -rf {} +
```