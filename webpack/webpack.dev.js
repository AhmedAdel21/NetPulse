import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { merge } from 'webpack-merge';
import common from './webpack.common.js';
import ReactRefreshWebpackPluginPkg from '@pmmmwh/react-refresh-webpack-plugin';


const ReactRefreshWebpackPlugin =
    ReactRefreshWebpackPluginPkg.default ?? ReactRefreshWebpackPluginPkg;


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export default merge(common, {
    mode: 'development',
    devtool: 'eval-cheap-module-source-map',

    output: {
        filename: '[name].js',
        chunkFilename: '[name].chunk.js',
    },

    plugins: [new ReactRefreshWebpackPlugin()],

    devServer: {
        static: {
            directory: path.resolve(rootDir, 'public'),
        },
        port: 3000,
        open: true,
        hot: true,
        historyApiFallback: true,
        client: {
            overlay: { errors: true, warnings: false },
        },
    },

    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
});