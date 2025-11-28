const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Scan = require('../models/Scan');
const { authenticate } = require('../middleware/auth');

/**
 * Helper function to generate CSV content
 */
function generateCSV(data) {
  const headers = ['URL', 'LLM Visibility Score', 'SEO Warnings', 'Citations', 'Analyzed At'];
  const rows = [headers.join(',')];
  
  data.forEach(scan => {
    const row = [
      scan.url || '',
      scan.llmVisibility?.percentage || 0,
      scan.seo?.warnings?.length || 0,
      scan.llmVisibility?.details?.reduce((sum, d) => sum + (d.citations?.length || 0), 0) || 0,
      scan.createdAt ? new Date(scan.createdAt).toISOString() : ''
    ];
    rows.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));
  });
  
  return rows.join('\n');
}

/**
 * GET /api/export/csv/:scanId
 * Export single scan as CSV
 */
router.get('/csv/:scanId', async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.scanId);
    
    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found'
      });
    }
    
    const csv = generateCSV([scan]);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="scan-${scan._id}.csv"`);
    res.send(csv);
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/export/csv/user/scans
 * Export all user scans as CSV (requires auth)
 */
router.get('/csv/user/scans', authenticate, async (req, res) => {
  try {
    const scans = await Scan.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100); // Limit to 100 most recent
    
    if (scans.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No scans found'
      });
    }
    
    const csv = generateCSV(scans);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="scans-${req.user._id}-${Date.now()}.csv"`);
    res.send(csv);
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/export/pdf/:scanId
 * Export single scan as PDF (requires premium)
 */
router.get('/pdf/:scanId', authenticate, async (req, res) => {
  try {
    // Check if user is premium
    const isPremium = req.user.isPremium && 
      (!req.user.premiumExpiresAt || req.user.premiumExpiresAt > new Date());
    
    if (!isPremium) {
      return res.status(403).json({
        success: false,
        error: 'PDF export is a premium feature. Please upgrade to access this feature.',
        requiresUpgrade: true
      });
    }
    
    const scan = await Scan.findById(req.params.scanId);
    
    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found'
      });
    }
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="optisense-scan-${scan._id}.pdf"`);
    
    // Generate PDF and stream to response
    await generatePDF(scan, res);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

/**
 * Generate PDF content using PDFKit
 */
async function generatePDF(scan, res) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      
      // Pipe PDF to response
      doc.pipe(res);
      
      // Define colors
      const brandColor = '#6366F1';
      const darkGray = '#374151';
      const lightGray = '#6B7280';
      
      // Header
      doc.fontSize(28).fillColor(brandColor).text('OptiSenseAI', { align: 'left' });
      doc.moveDown(0.3);
      doc.fontSize(18).fillColor(darkGray).text('SEO Analysis Report', { align: 'left' });
      doc.moveDown(0.5);
      
      // Divider line
      doc.strokeColor(brandColor).lineWidth(2).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(1);
      
      // Basic Info
      doc.fontSize(10).fillColor(lightGray).text('Generated on ' + new Date().toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }));
      doc.moveDown(2);
      
      // URL Section
      doc.fontSize(14).fillColor(brandColor).text('Analyzed URL', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor(darkGray).text(scan.url || 'N/A', { link: scan.url });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor(lightGray).text(`Analyzed at: ${scan.createdAt ? new Date(scan.createdAt).toLocaleString() : 'N/A'}`);
      doc.moveDown(2);
      
      // LLM Visibility Section
      doc.fontSize(14).fillColor(brandColor).text('LLM Visibility Score', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(24).fillColor(darkGray).text(`${scan.llmVisibility?.percentage || 0}%`, { align: 'left' });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor(lightGray).text(`Score: ${scan.llmVisibility?.totalScore || 0} / ${scan.llmVisibility?.maxScore || 0}`);
      doc.moveDown(2);
      
      // SEO Analysis Section
      doc.fontSize(14).fillColor(brandColor).text('SEO Analysis', { underline: true });
      doc.moveDown(0.5);
      
      // SEO Stats
      doc.fontSize(10).fillColor(darkGray);
      doc.text(`• HTTPS Enabled: ${scan.seo?.isHttps ? '✓ Yes' : '✗ No'}`, { continued: false });
      doc.text(`• Load Time: ${scan.seo?.loadTimeMs || 0}ms`);
      doc.text(`• Total Warnings: ${scan.seo?.warnings?.length || 0}`);
      
      if (scan.seo?.title) {
        doc.text(`• Page Title: ${scan.seo.title.substring(0, 80)}${scan.seo.title.length > 80 ? '...' : ''}`);
      }
      if (scan.seo?.metaDescription) {
        doc.text(`• Meta Description: ${scan.seo.metaDescription.substring(0, 100)}${scan.seo.metaDescription.length > 100 ? '...' : ''}`);
      }
      
      doc.moveDown(2);
      
      // SEO Warnings (if any)
      if (scan.seo?.warnings && scan.seo.warnings.length > 0) {
        doc.fontSize(14).fillColor(brandColor).text('SEO Warnings', { underline: true });
        doc.moveDown(0.5);
        
        doc.fontSize(9).fillColor(darkGray);
        scan.seo.warnings.slice(0, 15).forEach((warning, index) => {
          if (doc.y > 700) {
            doc.addPage();
            doc.moveDown(1);
          }
          doc.text(`${index + 1}. ${warning}`, { width: 500 });
        });
        
        if (scan.seo.warnings.length > 15) {
          doc.moveDown(0.5);
          doc.fontSize(8).fillColor(lightGray).text(`... and ${scan.seo.warnings.length - 15} more warnings`);
        }
      }
      
      doc.moveDown(2);
      
      // Images Analysis
      if (scan.seo?.images) {
        doc.fontSize(14).fillColor(brandColor).text('Images Analysis', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor(darkGray);
        doc.text(`• Total Images: ${scan.seo.images.total || 0}`);
        doc.text(`• Images with Alt Text: ${scan.seo.images.withAlt || 0}`);
        doc.text(`• Alt Text Coverage: ${scan.seo.images.altCoverage || 0}%`);
        doc.moveDown(1);
      }
      
      // Structured Data
      if (scan.seo?.structuredData) {
        doc.fontSize(14).fillColor(brandColor).text('Structured Data', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor(darkGray);
        doc.text(`• Schema Count: ${scan.seo.structuredData.count || 0}`);
        if (scan.seo.structuredData.schemas && scan.seo.structuredData.schemas.length > 0) {
          doc.text(`• Schemas: ${scan.seo.structuredData.schemas.map(s => s.schema).join(', ')}`);
        }
        doc.moveDown(1);
      }
      
      // Footer
      doc.fontSize(8).fillColor(lightGray);
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.text(
          `Page ${i + 1} of ${pageCount} | OptiSenseAI - SEO Analysis Report | ${new Date().getFullYear()}`,
          50,
          doc.page.height - 50,
          { align: 'center', width: doc.page.width - 100 }
        );
      }
      
      // Finalize the PDF
      doc.end();
      
      doc.on('finish', () => resolve());
      doc.on('error', (err) => reject(err));
      
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = router;

