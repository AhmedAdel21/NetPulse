import path from 'node:path';
import { fileURLToPath } from 'node:url';
import HtmlWebpackPluginPkg from 'html-webpack-plugin';

const HtmlWebpackPlugin = HtmlWebpackPluginPkg.default ?? HtmlWebpackPluginPkg;


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export default {
    entry: path.resolve(rootDir, 'src/index.tsx'),

    output: {
        path: path.resolve(rootDir, 'dist'),
        publicPath: '/',
        clean: true,
    },

    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js'],
        alias: {
            '@app': path.resolve(rootDir, 'src/app'),
            '@features': path.resolve(rootDir, 'src/features'),
            '@shared': path.resolve(rootDir, 'src/shared'),
            '@pages': path.resolve(rootDir, 'src/pages'),
        },
    },

    module: {
        rules: [
            {
                test: /\.(ts|tsx|js|jsx)$/,
                exclude: /node_modules/,
                use: 'babel-loader',
            },
            {
                test: /\.(png|jpg|jpeg|gif|svg|webp)$/i,
                type: 'asset',
                parser: {
                    dataUrlCondition: { maxSize: 8 * 1024 },
                },
            },
            {
                test: /\.(woff2?|ttf|otf|eot)$/i,
                type: 'asset/resource',
            },

        ],
    },

    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(rootDir, 'public/index.html'),
            inject: 'body',
        }),
    ],
};