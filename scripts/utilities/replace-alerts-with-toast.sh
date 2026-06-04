#!/bin/bash
# Script to replace browser alerts with toast notifications
# Usage: ./replace-alerts-with-toast.sh [file]
# If no file specified, processes all .tsx files in apps/web

set -e

replace_in_file() {
    local file="$1"
    echo "Processing: $file"
    
    # Check if file already has toast import
    if ! grep -q 'from "@/hooks/use-toast"' "$file" 2>/dev/null; then
        # Add toast import after "use client" directive if present, or at the top
        if grep -q '"use client"' "$file"; then
            sed -i '' 's/"use client";/"use client";\n\nimport { toast } from "@\/hooks\/use-toast";/' "$file"
        else
            sed -i '' '1i\
import { toast } from "@/hooks/use-toast";
' "$file"
        fi
        echo "  Added toast import"
    fi
    
    # Replace simple alert calls with toast
    # Pattern: alert('message') or alert("message")
    perl -i -pe "s/alert\('([^']+)'\)/toast({ title: '\$1', variant: 'destructive' })/g" "$file"
    perl -i -pe 's/alert\("([^"]+)"\)/toast({ title: "\$1", variant: "destructive" })/g' "$file"
    
    # Replace success alerts (containing 'success')
    perl -i -pe "s/toast\(\{ title: '([^']*success[^']*)', variant: 'destructive' \}\)/toast({ title: '\$1' })/gi" "$file"
    perl -i -pe 's/toast\(\{ title: "([^"]*success[^"]*)", variant: "destructive" \}\)/toast({ title: "\$1" })/gi' "$file"
    
    # Replace updated alerts
    perl -i -pe "s/toast\(\{ title: '([^']*updated[^']*)', variant: 'destructive' \}\)/toast({ title: '\$1' })/gi" "$file"
    perl -i -pe 's/toast\(\{ title: "([^"]*updated[^"]*)", variant: "destructive" \}\)/toast({ title: "\$1" })/gi' "$file"
    
    # Replace created alerts
    perl -i -pe "s/toast\(\{ title: '([^']*created[^']*)', variant: 'destructive' \}\)/toast({ title: '\$1' })/gi" "$file"
    perl -i -pe 's/toast\(\{ title: "([^"]*created[^"]*)", variant: "destructive" \}\)/toast({ title: "\$1" })/gi' "$file"
    
    # Replace deleted alerts  
    perl -i -pe "s/toast\(\{ title: '([^']*deleted[^']*)', variant: 'destructive' \}\)/toast({ title: '\$1' })/gi" "$file"
    perl -i -pe 's/toast\(\{ title: "([^"]*deleted[^"]*)", variant: "destructive" \}\)/toast({ title: "\$1" })/gi' "$file"
    
    echo "  Replaced alerts with toast"
}

if [ -n "$1" ]; then
    # Process single file
    replace_in_file "$1"
else
    # Process all .tsx files with alerts
    echo "Finding files with alert() calls..."
    grep -rln "alert(" apps/web --include="*.tsx" | while read -r file; do
        replace_in_file "$file"
    done
fi

echo "Done! Run 'grep -rn \"alert(\" apps/web --include=\"*.tsx\"' to verify no alerts remain."
