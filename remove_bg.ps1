$code = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;

public class ImageProcessor {
    public static void RemoveBackground(string inputPath, string outputPath) {
        using (Bitmap bmp = new Bitmap(inputPath)) {
            int width = bmp.Width;
            int height = bmp.Height;
            
            BitmapData bmpData = bmp.LockBits(new Rectangle(0, 0, width, height), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            int bytes = Math.Abs(bmpData.Stride) * height;
            byte[] rgbValues = new byte[bytes];
            System.Runtime.InteropServices.Marshal.Copy(bmpData.Scan0, rgbValues, 0, bytes);
            
            int threshold = 230; // Very high threshold to only catch pure/near-white backgrounds
            
            Queue<Point> q = new Queue<Point>();
            bool[] visited = new bool[width * height];
            
            for (int x = 0; x < width; x++) {
                q.Enqueue(new Point(x, 0)); visited[x] = true;
                q.Enqueue(new Point(x, height - 1)); visited[(height - 1) * width + x] = true;
            }
            for (int y = 0; y < height; y++) {
                q.Enqueue(new Point(0, y)); visited[y * width] = true;
                q.Enqueue(new Point(width - 1, y)); visited[y * width + width - 1] = true;
            }
            
            while (q.Count > 0) {
                Point p = q.Dequeue();
                int idx = (p.Y * bmpData.Stride) + (p.X * 4);
                
                byte b = rgbValues[idx];
                byte g = rgbValues[idx + 1];
                byte r = rgbValues[idx + 2];
                
                if (r > threshold && g > threshold && b > threshold) {
                    rgbValues[idx + 3] = 0; 
                    
                    int[] dx = {1, -1, 0, 0};
                    int[] dy = {0, 0, 1, -1};
                    for (int i=0; i<4; i++) {
                        int nx = p.X + dx[i];
                        int ny = p.Y + dy[i];
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            if (!visited[ny * width + nx]) {
                                visited[ny * width + nx] = true;
                                q.Enqueue(new Point(nx, ny));
                            }
                        }
                    }
                }
            }
            
            // Second pass for edge smoothing (Matting) to remove white halo
            for (int iter = 0; iter < 3; iter++) {
                for (int y = 1; y < height - 1; y++) {
                    for (int x = 1; x < width - 1; x++) {
                        int idx = (y * bmpData.Stride) + (x * 4);
                        if (rgbValues[idx + 3] == 255) {
                            bool border = false;
                            int[] dx = {1, -1, 0, 0, 1, 1, -1, -1};
                            int[] dy = {0, 0, 1, -1, 1, -1, 1, -1};
                            for (int i=0; i<8; i++) {
                                int nIdx = ((y+dy[i]) * bmpData.Stride) + ((x+dx[i]) * 4);
                                if (rgbValues[nIdx + 3] < 255) { border = true; break; }
                            }
                            
                            if (border) {
                                byte b2 = rgbValues[idx];
                                byte g2 = rgbValues[idx + 1];
                                byte r2 = rgbValues[idx + 2];
                                
                                int dist = (255 - r2) + (255 - g2) + (255 - b2);
                                if (dist < 180) {
                                    rgbValues[idx + 3] = (byte)(Math.Max(0, Math.Min(255, dist * 255 / 180)));
                                }
                            }
                        }
                    }
                }
            }
            
            System.Runtime.InteropServices.Marshal.Copy(rgbValues, 0, bmpData.Scan0, bytes);
            bmp.UnlockBits(bmpData);
            
            bmp.Save(outputPath, ImageFormat.Png);
        }
    }
}
"@
Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing
[ImageProcessor]::RemoveBackground("C:\Users\esra9\Pictures\app\assets\images\icon.png", "C:\Users\esra9\Pictures\app\assets\images\icon_transparent.png")
[ImageProcessor]::RemoveBackground("C:\Users\esra9\Pictures\app\assets\images\logo-glow.png", "C:\Users\esra9\Pictures\app\assets\images\logo-glow_transparent.png")
[ImageProcessor]::RemoveBackground("C:\Users\esra9\Pictures\app\assets\images\android-icon-foreground.png", "C:\Users\esra9\Pictures\app\assets\images\android-icon-foreground_transparent.png")
