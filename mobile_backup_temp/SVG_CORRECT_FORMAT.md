# Correct SVG Format for React Native

## ✅ What React Native SVG Needs

Your SVG files should be in this format:

### Required Format:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="currentColor"/>
</svg>
```

### Key Requirements:

1. **Must start with `<svg`** (not XML declaration)
   ```svg
   ✅ <svg xmlns="http://www.w3.org/2000/svg" viewBox="...">
   ❌ <?xml version="1.0" encoding="UTF-8"?>
   ```

2. **Must have `viewBox` attribute**
   ```svg
   ✅ viewBox="0 0 24 24"
   ❌ width="24" height="24" (without viewBox)
   ```

3. **Use `currentColor` for dynamic colors**
   ```svg
   ✅ fill="currentColor"
   ✅ stroke="currentColor"
   ❌ fill="#000000" (fixed color)
   ```

4. **No comments or metadata**
   ```svg
   ✅ <svg xmlns="...">
   ❌ <!-- Generator: Adobe Illustrator -->
   ```

5. **Clean, minimal code**
   - Remove unnecessary `id` attributes
   - Remove `width` and `height` if you have `viewBox`
   - Use 1-2 decimal places for paths

## 📋 Checklist for Your SVG Files

When providing SVG files, make sure they:

- [ ] Start with `<svg` (no XML declaration)
- [ ] Have `xmlns="http://www.w3.org/2000/svg"`
- [ ] Have `viewBox` attribute (e.g., `viewBox="0 0 24 24"`)
- [ ] Use `currentColor` instead of fixed colors (if you want dynamic colors)
- [ ] No comments (`<!-- ... -->`)
- [ ] No unnecessary `id` attributes
- [ ] Open in a text editor and show code (not binary)

## 📝 Examples

### ✅ Good Format (test.svg):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="8.99" fill="currentColor" />
</svg>
```

### ✅ Good Format (open-logo.svg):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76.3191 17.383">
  <path d="M28.0412.4478c-..." fill="currentColor"/>
  <path d="M6.4491.4943C-..." fill="currentColor"/>
</svg>
```

### ❌ Bad Format (has XML declaration):
```svg
<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="..." fill="#000000"/>
</svg>
```

### ❌ Bad Format (no viewBox):
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
  <path d="..." fill="#000000"/>
</svg>
```

## 🎨 From Design Tools

### Adobe Illustrator:
- Export → Export As → SVG
- Styling: Presentation Attributes
- Responsive: Yes (removes width/height, keeps viewBox)
- Minify: Yes
- Remove XML declaration manually

### Figma:
- Right-click → Copy as SVG
- Paste into text editor
- Remove XML declaration if present
- Replace fixed colors with `currentColor` if needed

### Inkscape:
- File → Save As → Optimized SVG
- Remove XML declaration
- Use `currentColor` for dynamic colors

## 💡 Quick Fixes

If you have an SVG that doesn't work:

1. **Remove XML declaration** (first line):
   ```svg
   ❌ <?xml version="1.0" encoding="utf-8"?>
   ✅ (delete this line)
   ```

2. **Add viewBox if missing**:
   ```svg
   ❌ <svg width="24" height="24">
   ✅ <svg viewBox="0 0 24 24">
   ```

3. **Replace fixed colors**:
   ```svg
   ❌ fill="#000000"
   ✅ fill="currentColor"
   ```

4. **Remove comments**:
   ```svg
   ❌ <!-- Generator: ... -->
   ✅ (delete)
   ```

## 🚀 How to Use

Once you have a correctly formatted SVG:

1. **Save it** in `apps/mobile/assets/your-icon.svg`
2. **Import it** in your component:
   ```javascript
   import YourIcon from '../assets/your-icon.svg';
   
   <YourIcon width={24} height={24} />
   ```

3. **Or create a component** (if you want more control):
   ```javascript
   import React from 'react';
   import Svg, { Path } from 'react-native-svg';
   
   export function YourIcon({ width = 24, height = 24, color = '#000' }) {
     return (
       <Svg width={width} height={height} viewBox="0 0 24 24">
         <Path d="..." fill={color} />
       </Svg>
     );
   }
   ```





