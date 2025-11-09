import mongoose, { Document, Schema } from 'mongoose';

export interface IUrl extends Document {
  originalUrl: string;
  shortCode: string;
  createdAt: Date;
  visitCount: number;
  updatedAt: Date;
}

const UrlSchema: Schema = new Schema({
  originalUrl: {
    type: String,
    required: true,
    validate: {
      validator: (v: string) => {
        return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(v);
      },
      message: (props: { value: string }) => `${props.value} is not a valid URL!`,
    },
  },
  shortCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  visitCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

UrlSchema.index({ shortCode: 1, originalUrl: 1 });

const Url = mongoose.model<IUrl>('Url', UrlSchema);

export default Url;
