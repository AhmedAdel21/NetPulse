
const isDev = process.env.BABEL_ENV === 'development' || process.env.NODE_ENV === 'development';

export default {
    presets: [
        '@babel/preset-env',
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript',
    ],
    plugins: [isDev && 'react-refresh/babel'].filter(Boolean),
    // plugins: [
    //     process.env.NODE_ENV !== 'production' && 'react-refresh/babel',
    // ].filter(Boolean),
};