module.exports = {
	entry: __dirname + '/src/main.js',
	output: {
		path: __dirname + '/build',
		filename: 'synteny-dotplot-builder.js'
	},
	module: {
		loaders: [
			{
				test: /\.jsx?$/,
				exclude: /node_modules/,
				loader: 'babel-loader'
			}, {
				test: /\.css$/,
				loader: "style-loader!css-loader"
			}
		]
	},
	resolve: {
		modulesDirectories: [ 'src', 'node_modules' ],
		extensions: [ '', '.js', '.jsx' ]
	},
	devtool: 'sourcemap'
};
