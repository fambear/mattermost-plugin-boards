// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"bytes"
	"encoding/base64"
	"image"
	"image/jpeg"
	"io"
	"strings"

	// Register image format decoders.
	_ "image/gif"
	_ "image/png"

	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

const (
	miniPreviewMaxDim  = 16
	miniPreviewQuality = 50
)

// ImageMetadata holds extracted image dimensions and mini preview.
type ImageMetadata struct {
	Width       int    `json:"width"`
	Height      int    `json:"height"`
	MiniPreview string `json:"miniPreview,omitempty"` // base64-encoded JPEG
}

// ExtractImageMetadata reads an image from the reader and returns its dimensions
// and a tiny base64-encoded JPEG preview. The reader is consumed.
// Returns nil (not error) for non-image or undecodable files.
func (a *App) ExtractImageMetadata(reader io.ReadSeeker, filename string) *ImageMetadata {
	ext := strings.ToLower(filename)
	if !strings.HasSuffix(ext, ".png") && !strings.HasSuffix(ext, ".jpg") &&
		!strings.HasSuffix(ext, ".jpeg") && !strings.HasSuffix(ext, ".gif") {
		return nil
	}

	// Decode image config (reads only header — fast, no full decode)
	imgConfig, _, err := image.DecodeConfig(reader)
	if err != nil {
		a.logger.Debug("ExtractImageMetadata: failed to decode config", mlog.Err(err))
		return nil
	}

	if imgConfig.Width == 0 || imgConfig.Height == 0 {
		return nil
	}

	result := &ImageMetadata{
		Width:  imgConfig.Width,
		Height: imgConfig.Height,
	}

	// Skip mini preview generation for very large images (>20MP) to bound memory usage.
	// The full image.Decode allocates W*H*4 bytes in memory.
	const maxPixelsForPreview = 20_000_000
	if int64(imgConfig.Width)*int64(imgConfig.Height) > maxPixelsForPreview {
		a.logger.Debug("ExtractImageMetadata: image too large for mini preview, returning dimensions only",
			mlog.Int("width", imgConfig.Width),
			mlog.Int("height", imgConfig.Height))
		return result
	}

	// Seek back to start for full decode (needed for mini preview)
	if _, err := reader.Seek(0, io.SeekStart); err != nil {
		return result
	}

	// Decode full image for resize — bounded by maxPixelsForPreview check above
	img, _, err := image.Decode(reader)
	if err != nil {
		a.logger.Debug("ExtractImageMetadata: failed to decode image", mlog.Err(err))
		return result
	}

	// Calculate mini preview dimensions preserving aspect ratio
	miniW, miniH := miniPreviewMaxDim, miniPreviewMaxDim
	if imgConfig.Width > imgConfig.Height {
		miniH = imgConfig.Height * miniPreviewMaxDim / imgConfig.Width
		if miniH < 1 {
			miniH = 1
		}
	} else {
		miniW = imgConfig.Width * miniPreviewMaxDim / imgConfig.Height
		if miniW < 1 {
			miniW = 1
		}
	}

	// Resize using simple nearest-neighbor (stdlib only, no external deps).
	// Quality doesn't matter for a 16x16 blur placeholder.
	srcBounds := img.Bounds()
	dst := image.NewRGBA(image.Rect(0, 0, miniW, miniH))
	for y := 0; y < miniH; y++ {
		for x := 0; x < miniW; x++ {
			srcX := srcBounds.Min.X + x*srcBounds.Dx()/miniW
			srcY := srcBounds.Min.Y + y*srcBounds.Dy()/miniH
			dst.Set(x, y, img.At(srcX, srcY))
		}
	}

	// Encode as JPEG
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: miniPreviewQuality}); err != nil {
		a.logger.Debug("ExtractImageMetadata: failed to encode mini preview", mlog.Err(err))
		return result
	}

	result.MiniPreview = base64.StdEncoding.EncodeToString(buf.Bytes())
	return result
}
