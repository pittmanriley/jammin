#!/bin/bash
set -e

# Patch Podfile to fix FirebaseCoreInternal issue
echo "🔧 Patching Podfile to use modular_headers for FirebaseCoreInternal..."
sed -i '' "s/pod 'FirebaseCoreInternal'/pod 'FirebaseCoreInternal', :modular_headers => true/" ios/Podfile || true
