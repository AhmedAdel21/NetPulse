import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { merge } from 'webpack-merge';
import webpack from 'webpack';
import MiniCssExtractPluginPkg from 'mini-css-extract-plugin';
import CssMinimizerPluginPkg from 'css-minimizer-webpack-plugin';
import CopyWebpackPluginPkg from 'copy-webpack-plugin';
import { BundleAnalyzerPlugin as BundleAnalyzerPluginPkg } from 'webpack-bundle-analyzer';
import TerserPluginPkg from 'terser-webpack-plugin';
import dotenv from 'dotenv';
import common from './webpack.common.js';

const MiniCssExtractPlugin = MiniCssExtractPluginPkg.default ?? MiniCssExtractPluginPkg;
const CssMinimizerPlugin = CssMinimizerPluginPkg.default ?? CssMinimizerPluginPkg;
const CopyWebpackPlugin = CopyWebpackPluginPkg.default ?? CopyWebpackPluginPkg;
const TerserPlugin = TerserPluginPkg.default ?? TerserPluginPkg;
const BundleAnalyzerPlugin = BundleAnalyzerPluginPkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Load .env into process.env (no error if file is missing)
dotenv.config({ path: path.resolve(rootDir, '.env') });

const isAnalyze = process.env.ANALYZE === 'true';

export default merge(common, {
    mode: 'production',
    devtool: 'source-map',

    output: {
        filename: 'static/js/[name].[contenthash:8].js',
        chunkFilename: 'static/js/[name].[contenthash:8].chunk.js',
        assetModuleFilename: 'static/media/[name].[hash:8][ext]',
    },

    module: {
        rules: [
            {
                test: /\.css$/i,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
        ],
    },

    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: { drop_console: true },
                    format: { comments: false },
                },
                extractComments: false,
            }),
            new CssMinimizerPlugin(),
        ],
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendors: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    priority: 10,
                    reuseExistingChunk: true,
                },
                common: {
                    minChunks: 2,
                    name: 'common',
                    priority: 5,
                    reuseExistingChunk: true,
                },
            },
        },
        runtimeChunk: 'single',
    },

    performance: {
        hints: 'warning',
        maxAssetSize: 500 * 1024,
        maxEntrypointSize: 500 * 1024,
    },

    plugins: [
        new MiniCssExtractPlugin({
            filename: 'static/css/[name].[contenthash:8].css',
            chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.resolve(rootDir, 'public'),
                    to: path.resolve(rootDir, 'dist'),
                    globOptions: { ignore: ['**/index.html'] },
                    noErrorOnMissing: true,
                },
            ],
        }),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production'),
            'process.env.API_URL': JSON.stringify(process.env.API_URL ?? ''),
        }),
        ...(isAnalyze
            ? [
                new BundleAnalyzerPlugin({
                    analyzerMode: 'static',
                    reportFilename: path.resolve(rootDir, 'bundle-report.html'),
                    openAnalyzer: true,
                }),
            ]
            : []),
    ],
});