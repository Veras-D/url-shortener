import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IUrl extends Document {
  originalUrl: string;
  shortCode: string;
  userId: Types.ObjectId;
  visitCount: number;
  createdAt: Date;
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
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  visitCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

UrlSchema.index({ shortCode: 1, originalUrl: 1 });
UrlSchema.index({ userId: 1 });

const Url = mongoose.model<IUrl>('Url', UrlSchema);

export default Url;
